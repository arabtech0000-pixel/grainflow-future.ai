import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import fs from "fs";

const configPath = "firebase-applet-config.json";
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const email = "ashirafashes04@gmail.com";
const pwd = "popular-24";

createUserWithEmailAndPassword(auth, email, pwd)
  .then((cred) => {
    console.log("Created:", cred.user.uid);
    process.exit(0);
  })
  .catch((e) => {
    if (e.code === 'auth/email-already-in-use') {
      console.log("Already exists, signing in...");
      signInWithEmailAndPassword(auth, email, pwd)
        .then(c => { console.log("Signed in:", c.user.uid); process.exit(0); })
        .catch(e2 => { console.error("Sign in error:", e2); process.exit(1); })
    } else {
      console.error("Create error:", e);
      process.exit(1);
    }
  });
