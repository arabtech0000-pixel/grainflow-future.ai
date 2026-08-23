import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const configPath = "firebase-applet-config.json";
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

getDoc(doc(db, "users", "test")).then(snap => {
  console.log("Exists:", snap.exists());
  process.exit(0);
}).catch(e => {
  console.error("Error:", e);
  process.exit(1);
});
