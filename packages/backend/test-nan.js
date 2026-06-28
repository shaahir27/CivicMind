const { getFirestore } = require('firebase-admin/firestore');

const db = getFirestore();
db.collection('test').doc('1').set({ val: NaN }).then(() => console.log('success')).catch(e => console.error(e));
