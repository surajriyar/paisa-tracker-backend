
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Income = require("./models/Income");
const Expense = require("./models/Expense");
const User = require("./models/user");


const {
  initializeApp,
  cert,
} = require("firebase-admin/app");

const {
  getAuth,
} = require("firebase-admin/auth");

const serviceAccount = require("/etc/secrets/firebase-service-account.json");

const firebaseAdmin = initializeApp({
  credential: cert(serviceAccount),
});

const firebaseAuth = getAuth(firebaseAdmin);


// =====================================================
// EXPRESS APP
// =====================================================

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// TEST ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message: "Paisa Tracker Backend is running",
  });
});

// =====================================================
// MONGODB CONNECTION
// =====================================================

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log(
      "MongoDB connection failed:",
      error.message
    );
  });

// =====================================================
// REGISTER USER
// =====================================================

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const user = new User({
      name,
      email,
      password,
    });

    const savedUser = await user.save();

    res.status(201).json({
      message: "User registered successfully",

      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
      },
    });
  } catch (error) {
    console.log("Register Error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// NORMAL LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.password !== password) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    res.json({
      message: "Login successful",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Login Error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});


// =====================================================
// GOOGLE LOGIN
// =====================================================

app.post("/api/google-login", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Firebase token is required",
      });
    }

    // Verify Firebase ID Token
    const decodedToken =
  await firebaseAuth.verifyIdToken(token);

    const {
      uid,
      email,
      name,
    } = decodedToken;

    if (!email) {
      return res.status(400).json({
        message: "Google account email not found",
      });
    }

    // Find existing user
    let user = await User.findOne({
      email,
    });

    // Create new user if not found
    if (!user) {
      user = new User({
        name: name || "Google User",
        email: email,
        password: `google_${uid}`,
      });

      await user.save();

      console.log(
        "New Google user created:",
        email
      );
    }

    res.json({
      message: "Google login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.log(
      "Google Login Error:",
      error
    );

    res.status(401).json({
      message: error.message,
    });
  }
});





// =====================================================
// CHANGE PASSWORD
// =====================================================

app.put("/api/change-password", async (req, res) => {
  try {
    const {
      email,
      currentPassword,
      newPassword,
    } = req.body;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.password !== currentPassword) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;

    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.log(
      "Change Password Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// RESET PASSWORD
// =====================================================

app.put("/api/reset-password", async (req, res) => {
  try {
    const {
      email,
      newPassword,
    } = req.body;

    const user = await User.findOne({
      email,
    });

    if (!user) {
      return res.status(404).json({
        message: "Email not found",
      });
    }

    if (
      newPassword.length < 2 ||
      newPassword.length > 6
    ) {
      return res.status(400).json({
        message:
          "Password must be between 2 and 6 characters",
      });
    }

    user.password = newPassword;

    await user.save();

    res.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.log(
      "Reset Password Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// INCOME
// =====================================================

// GET USER-WISE INCOMES

app.get("/api/incomes", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const incomes = await Income.find({
      userId,
    }).sort({
      createdAt: -1,
    });

    res.json(incomes);
  } catch (error) {
    console.log(
      "Get Income Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// ADD INCOME

app.post("/api/incomes", async (req, res) => {
  try {
    const {
      userId,
      title,
      amount,
      category,
      date,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const income = new Income({
      userId,
      title,
      amount,
      category,
      date,
    });

    const savedIncome =
      await income.save();

    res.status(201).json(
      savedIncome
    );
  } catch (error) {
    console.log(
      "Add Income Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// UPDATE INCOME

app.put("/api/incomes/:id", async (req, res) => {
  try {
    const {
      userId,
      title,
      amount,
      category,
      date,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const updatedIncome =
      await Income.findOneAndUpdate(
        {
          _id: req.params.id,
          userId,
        },
        {
          title,
          amount,
          category,
          date,
        },
        {
          new: true,
        }
      );

    if (!updatedIncome) {
      return res.status(404).json({
        message: "Income not found",
      });
    }

    res.json(updatedIncome);
  } catch (error) {
    console.log(
      "Update Income Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// DELETE INCOME

app.delete("/api/incomes/:id", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const deletedIncome =
      await Income.findOneAndDelete({
        _id: req.params.id,
        userId,
      });

    if (!deletedIncome) {
      return res.status(404).json({
        message: "Income not found",
      });
    }

    res.json({
      message:
        "Income deleted successfully",
    });
  } catch (error) {
    console.log(
      "Delete Income Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// =====================================================
// EXPENSE
// =====================================================

// GET USER-WISE EXPENSES

app.get("/api/expenses", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const expenses =
      await Expense.find({
        userId,
      }).sort({
        createdAt: -1,
      });

    res.json(expenses);
  } catch (error) {
    console.log(
      "Get Expense Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// ADD EXPENSE

app.post("/api/expenses", async (req, res) => {
  try {
    const {
      userId,
      title,
      amount,
      category,
      date,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const expense =
      new Expense({
        userId,
        title,
        amount,
        category,
        date,
      });

    const savedExpense =
      await expense.save();

    res.status(201).json(
      savedExpense
    );
  } catch (error) {
    console.log(
      "Add Expense Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// UPDATE EXPENSE

app.put("/api/expenses/:id", async (req, res) => {
  try {
    const {
      userId,
      title,
      amount,
      category,
      date,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const updatedExpense =
      await Expense.findOneAndUpdate(
        {
          _id: req.params.id,
          userId,
        },
        {
          title,
          amount,
          category,
          date,
        },
        {
          new: true,
        }
      );

    if (!updatedExpense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    res.json(updatedExpense);
  } catch (error) {
    console.log(
      "Update Expense Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

// DELETE EXPENSE

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const deletedExpense =
      await Expense.findOneAndDelete({
        _id: req.params.id,
        userId,
      });

    if (!deletedExpense) {
      return res.status(404).json({
        message: "Expense not found",
      });
    }

    res.json({
      message:
        "Expense deleted successfully",
    });
  } catch (error) {
    console.log(
      "Delete Expense Error:",
      error
    );

    res.status(500).json({
      message: error.message,
    });
  }
});

