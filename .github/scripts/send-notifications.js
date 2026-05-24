// Script d'envoi de notifications push quotidiennes
// Exécuté par GitHub Actions chaque soir à 20h (Paris)
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'alphabet-thai',
});

const db = admin.firestore();
const messaging = admin.messaging();

// Messages de motivation variés selon le jour de la semaine
const DAILY_MESSAGES = [
  { title: '📚 Révision du soir', body: 'Quelques minutes de thaï ce soir ? Ta série t\'attend !' },
  { title: '🔥 Continue ta série !', body: 'Tu as progressé cette semaine. Garde le rythme ce soir !' },
  { title: '🇹🇭 สวัสดี ! Bonsoir !', body: 'Révise une leçon rapide avant de dormir.' },
  { title: '📚 5 minutes de thaï', body: 'C\'est tout ce qu\'il faut pour avancer aujourd\'hui !' },
  { title: '🏆 Ta progression t\'attend', body: 'Ouvre Thai ABC et fais un quiz ce soir.' },
  { title: '✨ Apprends une lettre', body: 'Connais-tu déjà les 44 consonnes ? Révise-les !' },
  { title: '🔥 Ne perds pas ta série !', body: 'Une petite session ce soir pour maintenir ta flamme.' },
];

async function run() {
  const day = new Date().getDay(); // 0=dim, 1=lun, …
  const msg = DAILY_MESSAGES[day];

  // Récupère tous les utilisateurs avec notifications activées
  const snapshot = await db.collection('users')
    .where('notifEnabled', '==', true)
    .get();

  if (snapshot.empty) {
    console.log('Aucun utilisateur avec notifications activées.');
    return;
  }

  const tokens = [];
  snapshot.forEach(doc => {
    const token = doc.data().fcmToken;
    if (token) tokens.push(token);
  });

  console.log(`Envoi à ${tokens.length} utilisateur(s)…`);

  if (tokens.length === 0) {
    console.log('Aucun token FCM trouvé.');
    return;
  }

  // Envoi par batch de 500 (limite FCM)
  const batchSize = 500;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: {
        title: msg.title,
        body: msg.body,
      },
      webpush: {
        notification: {
          icon: 'https://hoarau808-hash.github.io/alphabet-thai/icon-192.png',
          badge: 'https://hoarau808-hash.github.io/alphabet-thai/icon-192.png',
          tag: 'thai-abc-daily',
          renotify: false,
        },
        fcmOptions: {
          link: 'https://hoarau808-hash.github.io/alphabet-thai/',
        },
      },
    });

    sent += response.successCount;
    failed += response.failureCount;

    // Supprime les tokens invalides de Firestore
    const invalidTokens = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;
        if (code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(batch[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      const usersSnap = await db.collection('users')
        .where('fcmToken', 'in', invalidTokens.slice(0, 30)) // Firestore limite 'in' à 30
        .get();
      const cleanBatch = db.batch();
      usersSnap.forEach(doc => {
        cleanBatch.update(doc.ref, { fcmToken: admin.firestore.FieldValue.delete(), notifEnabled: false });
      });
      await cleanBatch.commit();
      console.log(`${invalidTokens.length} token(s) invalide(s) supprimé(s).`);
    }
  }

  console.log(`✅ Notifications envoyées : ${sent} succès, ${failed} échec(s).`);
}

run().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
