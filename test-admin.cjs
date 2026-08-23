const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
  credential: applicationDefault()
});

getAuth().createUser({
  email: 'ashirafashes04@gmail.com',
  password: 'popular-24',
})
  .then((userRecord) => {
    console.log('Successfully created new user:', userRecord.uid);
    process.exit(0);
  })
  .catch((error) => {
    console.log('Error creating new user:', error);
    process.exit(1);
  });
