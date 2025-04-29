const axios = require("axios");
const { db, admin } = require("../config/firebase");

// Calculate order total
const calculateOrderAmount = (items) => {
  const total = items.reduce((acc, item) => acc + item.price * item.cartQuantity, 0);
  return total * 100; // Convert to kobo
};

exports.createPaymentIntent = async (req, res) => {
  const { items, email, shipping, description } = req.body;

  if (!items || !email || !shipping) {
    return res.status(400).send({ error: "Missing required fields" });
  }

  const totalAmount = calculateOrderAmount(items);

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: totalAmount,
        currency: "NGN",
        callback_url: `${process.env.FRONTEND_URL}/Payment-success`,
        description,
        metadata: {
          custom_fields: [
            {
              display_name: shipping.name,
              variable_name: shipping.phone,
              value: `${shipping.line1}, ${shipping.city}, ${shipping.country}`,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.send({
      authorizationUrl: response.data.data.authorization_url,
      reference: response.data.data.reference,
    });
  } catch (error) {
    res.status(500).send({
      message: "Payment initialization failed",
      error: error.response?.data || error.message,
    });
  }
};

exports.verifyPayment = async (req, res) => {
  const { reference } = req.params;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (response.data.data.status === "success") {
      const order = {
        userID: req.body.userID || "Unknown User",
        userEmail: req.body.email || "No Email",
        orderDate: new Date().toDateString(),
        orderTime: new Date().toLocaleTimeString(),
        orderAmount: req.body.amount || 0,
        orderStatus: "Order Placed...",
        cartItems: req.body.items || [],
        shippingAddress: req.body.shipping || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!order.userID || !order.userEmail || !order.cartItems.length) {
        return res.status(400).json({ message: "Invalid order details" });
      }

      const orderRef = await db.collection("orders").add(order);

      return res.json({ status: "success", orderId: orderRef.id });
    }

    return res.status(400).json({ status: "failed", message: "Payment not successful" });
  } catch (error) {
    res.status(500).json({
      message: "Payment verification failed",
      error: error.response?.data || error.message,
    });
  }
};
