const express = require("express");
const bcrypt = require("bcrypt");
const NewUser = require("../models/register.js");
// import cloudinary from "../config/cloudinary.js";
// const cloudinary = require("../config/cloudinary.js");
const Jwt = require("jsonwebtoken");

const Register = async (req, res) => {
  try {
    const { name, password, email } = req.body;
    console.log(req.body);
    const existingUser = await NewUser.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new NewUser({
      name,
      email,
      password: hashedPassword,
      picture: {
        public_id: req.file.key,
        url: req.file.location,
      },
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email,password);
    
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await NewUser.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = Jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    return res.status(200).json({ message: "Login successful", token, user:{_id:user._id, name:user.name, picture:user.picture} });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


const fetchallUser = async (req, res) => {
  try {
    console.log("Fetching all users");
    
    const users = await NewUser.find({});
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
};


const getProfile = async (req, res) => {
  try {
    const user = req.user; // Already populated from middleware
    res.status(200).json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { Register, Login,fetchallUser,getProfile };
