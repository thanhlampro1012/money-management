/** Firebase Web modular SDK transport. Imported only after a user configures Firebase.
 * The public web configuration is NOT a service-account key or an auth secret.
 * All private data is encrypted by firebase-sync.js before it reaches Firestore.
 */
const SDK = 'https://www.gstatic.com/firebasejs/13.4.0';
let modulesPromise;
const failure = (code, message) => Object.assign(new Error(message), { code });

async function loadModules() {
  if (!modulesPromise) modulesPromise = Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]).catch(error => { modulesPromise = null; throw error; });
  return modulesPromise;
}

export async function createFirebaseTransport(config, { onAuthChanged = () => {}, onError = () => {} } = {}) {
  const [appApi, authApi, dbApi] = await loadModules();
  const name = `money-management-${config.projectId}`;
  const app = appApi.getApps().find(item => item.name === name) || appApi.initializeApp(config, name);
  const auth = authApi.getAuth(app);
  await authApi.setPersistence(auth, authApi.browserLocalPersistence);
  const db = dbApi.getFirestore(app);
  let unsubAuth = null;
  const docFor = uid => dbApi.doc(db, 'users', uid, 'private', 'ledger');
  const normalize = snapshot => {
    if (!snapshot.exists()) return null;
    const value = snapshot.data();
    if (value?.version !== 1 || !Number.isSafeInteger(value.revision) || value.revision < 1
      || typeof value.envelope !== 'string' || value.envelope.length > 900_000) {
      throw failure('REMOTE_INVALID', 'Bản Firestore không đúng định dạng hoặc vượt giới hạn an toàn.');
    }
    let envelope;
    try { envelope = JSON.parse(value.envelope); }
    catch { throw failure('REMOTE_INVALID', 'Không đọc được bản mã hóa trên Firestore.'); }
    return { revision: value.revision, envelope };
  };
  unsubAuth = authApi.onAuthStateChanged(auth, user => onAuthChanged(user ? { uid: user.uid, email: user.email || '' } : null), onError);
  return {
    currentUser: () => auth.currentUser ? { uid: auth.currentUser.uid, email: auth.currentUser.email || '' } : null,
    signIn: (email, password) => authApi.signInWithEmailAndPassword(auth, email, password),
    signUp: (email, password) => authApi.createUserWithEmailAndPassword(auth, email, password),
    signOut: () => authApi.signOut(auth),
    resetPassword: email => authApi.sendPasswordResetEmail(auth, email),
    get: async uid => normalize(await dbApi.getDocFromServer(docFor(uid))),
    subscribe(uid, next, fail = onError) {
      return dbApi.onSnapshot(docFor(uid), { includeMetadataChanges: true }, snapshot => {
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        try { next(normalize(snapshot)); } catch (error) { fail(error); }
      }, fail);
    },
    /** Transaction enforces revision compare-and-swap on the server. */
    async put(uid, expectedRevision, envelope) {
      const serialized = JSON.stringify(envelope);
      if (serialized.length > 780_000) throw failure('TOO_LARGE', 'Sổ mã hóa quá lớn cho một tài liệu Firestore. Hãy xuất JSON và chia sổ.');
      const target = docFor(uid);
      return dbApi.runTransaction(db, async transaction => {
        const snapshot = await transaction.get(target);
        const current = snapshot.exists() ? normalize(snapshot) : null;
        const existing = current?.revision || 0;
        if (existing !== expectedRevision) throw failure('REVISION_CONFLICT', 'Sổ đám mây vừa thay đổi trên thiết bị khác. Đã dừng ghi để tránh ghi đè.');
        const revision = existing + 1;
        transaction.set(target, { version: 1, revision, envelope: serialized, updatedAt: dbApi.serverTimestamp() });
        return { revision, envelope };
      });
    },
    close() { unsubAuth?.(); /* Keep Firebase auth persistence for next visit. */ },
  };
}
