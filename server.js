require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const Income = require("./models/Income");
const Expense = require("./models/Expense");
const User = require("./models/user");

const app = express();


// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());


// =========================
// MONGODB CONNECTION
// =========================

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(process.env.PORT || 5000, () => {
      console.log(
        `Server running on port ${process.env.PORT || 5000}`
      );
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
    res.status(500).json({
      message: error.message,
    });
  }
});


// =====================================================
// LOGIN USER
// =====================================================

app.post("/api/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

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
    res.status(500).json({
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

    const {
      userId,
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const incomes = await Income.find({
      userId: userId,
    }).sort({
      createdAt: -1,
    });

    res.json(incomes);

  } catch (error) {

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
          userId: userId,
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

    res.json(
      updatedIncome
    );

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
});


// DELETE INCOME

app.delete("/api/incomes/:id", async (req, res) => {
  try {

    const {
      userId,
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const deletedIncome =
      await Income.findOneAndDelete({
        _id: req.params.id,
        userId: userId,
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

    const {
      userId,
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const expenses =
      await Expense.find({
        userId: userId,
      }).sort({
        createdAt: -1,
      });

    res.json(
      expenses
    );

  } catch (error) {

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
          userId: userId,
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

    res.json(
      updatedExpense
    );

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
});


// DELETE EXPENSE

app.delete("/api/expenses/:id", async (req, res) => {
  try {

    const {
      userId,
    } = req.query;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const deletedExpense =
      await Expense.findOneAndDelete({
        _id: req.params.id,
        userId: userId,
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

    res.status(500).json({
      message: error.message,
    });

  }
});