const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Replace imports
content = content.replace(
  /import \{[\s\S]*?\} from "firebase\/firestore";/,
  `import { getDatabase, ref, set, get, child, update, serverTimestamp, query, orderByChild, equalTo, push } from "firebase/database";`
);

// Replace init
content = content.replace(
  /const db = firebaseConfig\.firestoreDatabaseId[\s\S]*?getFirestore\(app\);/,
  `const db = getDatabase(app, "https://elearning-e9601-default-rtdb.firebaseio.com");`
);

// We need to replace all doc(), collection(), setDoc(), getDoc(), getDocs() etc
content = content.replace(/await setDoc\(doc\(db, "users", adminUid\), \{/g, `await set(ref(db, \`users/\${adminUid}\`), {`);

// Instead of doing it by regex which is prone to failure on complex blocks, let's write a python script or replace the file.
