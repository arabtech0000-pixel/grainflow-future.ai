import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const configPath = "firebase-applet-config.json";
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

signInWithEmailAndPassword(auth, "test@example.com", "password").then(() => {
  console.log("Success login");
  process.exit(0);
}).catch(e => {
  if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
      createUserWithEmailAndPassword(auth, "test@example.com", "password").then(() => {
          console.log("Success create");
          process.exit(0);
      }).catch(e2 => {
          console.error("Create error:", e2);
          process.exit(1);
      });
  } else {
      console.error("Login error:", e);
      process.exit(1);
  }
});
