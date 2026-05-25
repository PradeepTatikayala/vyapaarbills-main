const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");

admin.initializeApp();

// Initialize Razorpay with environment variables
// In production, set these using: firebase functions:config:set razorpay.id="YOUR_ID" razorpay.secret="YOUR_SECRET"
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: functions.config().razorpay?.id || "rzp_test_placeholder",
    key_secret: functions.config().razorpay?.secret || "secret_placeholder",
  });
};

exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const uid = context.auth.uid;
  const userRecord = await admin.firestore().collection("users").doc(uid).get();
  
  if (!userRecord.exists) {
    throw new functions.https.HttpsError("not-found", "User not found.");
  }

  const plan = userRecord.data().plan;
  let amount = 0;
  
  if (plan === "basic") amount = 1000 * 100; // Rs 1000 in paise
  else if (plan === "medium") amount = 2500 * 100;
  else if (plan === "custom") amount = 5000 * 100; // Default custom placeholder
  else throw new functions.https.HttpsError("invalid-argument", "Invalid plan");

  const rzp = getRazorpayInstance();

  try {
    const order = await rzp.orders.create({
      amount: amount,
      currency: "INR",
      receipt: `receipt_${uid}_${Date.now()}`,
    });

    // Save pending transaction to Firestore
    await admin.firestore().collection("transactions").doc(order.id).set({
      userId: uid,
      amount: amount / 100,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      razorpay_order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: functions.config().razorpay?.id || "rzp_test_placeholder"
    };
  } catch (error) {
    console.error("Razorpay error", error);
    throw new functions.https.HttpsError("internal", "Failed to create order");
  }
});

exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

  const secret = functions.config().razorpay?.secret || "secret_placeholder";
  
  const generated_signature = crypto
    .createHmac("sha256", secret)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    // Payment successful
    await admin.firestore().collection("transactions").doc(razorpay_order_id).update({
      status: "success",
      razorpay_payment_id,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Reactivate user or upgrade plan
    await admin.firestore().collection("users").doc(context.auth.uid).update({
      is_active: true
    });

    return { success: true };
  } else {
    // Payment failed verification
    await admin.firestore().collection("transactions").doc(razorpay_order_id).update({
      status: "failed",
    });
    throw new functions.https.HttpsError("invalid-argument", "Invalid signature");
  }
});
