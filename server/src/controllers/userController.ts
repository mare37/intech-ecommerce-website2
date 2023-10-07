import { Request, Response } from "express";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import userModel from "../models/userModel";
import { createToken, createRefreshToken } from "../JWT";
import jwt from "jsonwebtoken";

import { validationResult } from "express-validator";

import render from "ejs";

import validateMongoID from "../middlewares/validateMongoId";
import { link } from "fs";
import { UserPayload } from "../types";

export const register = async (req: Request, res: Response) => {
  console.log(req.body);

  const { firstName, lastName, email, mobile, password } = req.body;

  try {
    const User = await userModel.find({
      email: email,
    });

    if (User.length > 0) {
      throw new Error("Email already exists");
      // return res.send({registration:false, message:"Email already exists"})
    }
  } catch (err) {
    console.log(err);

    return res.send({ registration: false, message: "Email already exists" });
  }

  try {
    const UserMobile = await userModel.find({
      mobile: mobile,
    });

    if (UserMobile.length > 0) {
      throw new Error("Mobile number already exists");
      //res.send({registration:false, message:"Email already exists"})
    }
  } catch (err) {
    console.log(err);
    return res.send({
      registration: false,
      message: "Mobile number already exists",
    });
  }

  try {
    const hashPassword = await bcrypt.hash(password, 10);

    console.log(hashPassword);

    const registerUser = await userModel.create({
      firstName: firstName,
      lastName: lastName,
      email: email,
      mobile: mobile,
      password: hashPassword,
    });

    console.log(registerUser);

    res.send({ registration: true, message: "Registration succesfull" });
  } catch (err) {
    console.log(err);

    res.send({ registration: false, err: err });
  }

  // console.log(User);

  /*  if(User.length > 0 || UserMobile.length > 0  ){
        res.send({registration:false, message:"Email or Mobile already exists"})
    }else{


     

     

    }*/
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const User = await userModel.find({ email: email });

    if (User.length === 0) throw new Error("User not registered");

    console.log(User);

    if (User.length > 0) {
      // we have found user

      const dbpassword = User[0].password;

      const match = await bcrypt.compare(password, dbpassword);

      if (match) {
        console.log(match);

        const accessToken = createToken({
          email: User[0].email,
          id: User[0]._id.toString(),
        });
        const refreshToken = createToken({
          email: User[0].email,
          id: User[0]._id.toString(),
        });

        //if there is no secret they return false else they returns a string
        if (!accessToken) throw new Error("Secret required");
        if (!refreshToken) throw new Error("Secret required");
        const id = User[0]._id.toString();
        console.log(id);

        const result = await userModel.findByIdAndUpdate(
          { _id: id },
          { refreshToken },
          { new: true }
        );

        res.cookie("access_token", accessToken, {
          maxAge: 60 * 60 * 60 * 60 * 60,
          httpOnly: true,
          secure: true,
        });

        res.cookie("refresh_token", refreshToken, {
          maxAge: 60 * 60 * 60 * 60 * 60 * 60 * 60,
          httpOnly: true,
          secure: true,
        });

        req.user =  User[0].email

        console.log("LOG REQ.USER    "  + req.user);
        


        res
          .send({
            auth: true,
            message: "You are logged in!",
            result: result,
          })
          .status(200);
      } else {
        res
          .send({
            auth: false,
            message: "Wrong password!",
          })
          .status(401);
      }
    }
  } catch (err) {
    console.log(err);
    res
      .send({
        auth: false,
        err: err,
      })
      .status(401);
  }
};

export const logOut = async (req: Request, res: Response) => {
  const refreshToken = req.cookies["refresh_token"];

  if (!refreshToken) {
    return res.send("Error no token");
  }

  const User = await userModel.findOneAndUpdate(
    { refreshToken: refreshToken },
    { refreshToken: "" }
  );

  if (!User) {
    return res.send("Token is invalid");
  }

  res.clearCookie("access_token", {
    httpOnly: true,
    secure: true,
  });

  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: true,
  });

  res.status(200).send("You have logged out");
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies["refresh_token"];
  const SECRET = process.env.SECRET || "";

  try {
    if (!refreshToken) {
      return res
        .send({
          auth: false,
          message: "Login to continue",
        })
        .status(401);
    }

    const User = await userModel.find({ refreshToken: refreshToken });

    console.log(User);

    jwt.verify(refreshToken, SECRET, async function (err: any, decoded: any) {
      if (err) {
        return res.send(err);
      }

      if (User[0]?.email === decoded?.email) {
        const accessToken = jwt.sign(
          { email: User[0].email, id: User[0]._id.toString() },
          SECRET,
          { expiresIn: "1h" }
        );

        res.cookie("access_token", accessToken, {
          maxAge: 60 * 60,
          httpOnly: true,
          secure: true,
        });

        res.send(User);
      } else {
        res
          .send({
            auth: false,
            message: "Invalid token",
          })
          .status(401);
      }
    });
  } catch (err) {
    console.log(err);
    return res.send(err);
  }
};






export const changePassword = async (req: Request, res: Response) => {
  const email = req.body.email;
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;
  console.log(email);
  console.log(currentPassword);
  console.log(newPassword);

  const date = new Date();

  console.log(date);

  try {
    const User = await userModel.find({
      email: email,
    });

    if (User.length > 0) {
      console.log(User);

      const databasePassword = User[0].password;

      const match = await bcrypt.compare(currentPassword, databasePassword);

      if (match) {
        console.log(match);

        const hashPassword = await bcrypt.hash(newPassword, 10);

        const result = await userModel.findOneAndUpdate(
          { email: email },
          { password: hashPassword, passwordChangedAt: date },
          { new: true }
        );

        res
          .send({
            passwordChanged: true,
            message: "Password changed successfully",
            result: result,
          })
          .status(200);
      } else {
        res.send({
          passwordChanged: false,
          message: "Wrong password",
        });
      }

      // return res.send({registration:false, message:"Email already exists"})
    } else {
      res.send({
        passwordChanged: false,
        message: "Wrong email",
      });
    }
  } catch (err) {
    console.log(err);

    return res.send({
      passwordChanged: false,
      error: err,
    });
  }
};

//--------------------------------------------------------------------------------------------

export const forgotpassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  //const date = new Date();
  // console.log(email);

  try {
    const User = await userModel.find({
      email: email,
    });

    if (User.length > 0) {
      console.log(User);

      const passwordResetToken = createToken({
        email: User[0].email,
        id: User[0]._id.toString(),
      });

      if (passwordResetToken !== false) {
        var date = new Date();
        date.setMinutes(date.getMinutes() + 100);

        const tokenResult = await userModel.findOneAndUpdate(
          { email: User[0].email },
          { passwordResetToken: passwordResetToken, passwordResetExpires: date }
        );

        res.cookie("password_Reset_Token", passwordResetToken, {
          maxAge: 60 * 60 * 60 * 60 * 60,
          httpOnly: true,
          secure: true,
        });
      }

      const path = `http://${process.env.HOSTNAME}:${process.env.PORT}/forgotpassword`;
      const link = path + "/" + passwordResetToken;
      console.log(passwordResetToken);

      ("use strict");

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",

        auth: {
          // TODO: replace `user` and `pass` values from <https://forwardemail.net>
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      // async..await is not allowed in global scope, must use a wrapper
      async function main() {
        // send mail with defined transport object
        const info = await transporter.sendMail({
          from: "intechmedia.com", // sender address
          to: email, // list of receivers
          subject: "Password reset", // Subject line
          text: link, // plain text body
          html: `<b>CLICK THIS LINK TO CHANGE YOUR PASSWORD: ${link} <br/> <br/>THIS LINK WILL EXPIRE AFTER 20 MINUTES </b>`, // html body
        });

        console.log("Message sent: %s", info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

        //
        // NOTE: You can go to https://forwardemail.net/my-account/emails to see your email delivery status and preview
        //       Or you can use the "preview-email" npm package to preview emails locally in browsers and iOS Simulator
        //       <https://github.com/forwardemail/preview-email>
        //
      }

      main().catch(console.error);

      res.send({message:"Message sent",token: passwordResetToken});
    } else {
      res.send({
        passwordReset: false,
        message: "wrong email",
      });
    }
  } catch (err) {
    res.send({
      passwordReset: false,
      error: err,
    });
  }
};





export const renderChangePasswordPage = async (req: Request, res: Response) => {
  const SECRET = process.env.SECRET || "";
  const { token } = req.params;

  console.log("This is the token    " + token);

  try {
    const User = await userModel.find({ passwordResetToken: token });

    if (User.length === 1) {
      const decoded: any = jwt.verify(token, SECRET);

      if (User[0].email === decoded?.email) {
        console.log(User);

        const passwordExpriryDate = new Date(User[0].passwordResetExpires);
        const today = new Date();

        if (passwordExpriryDate < today) {
          /*  const tokenResult = await userModel.findOneAndUpdate(
                          { email: User[0].email },
                          { passwordResetToken: '' }
                     );*/

          res.send({ message: "Link expired" });
        } else {
          console.log();

          res.render("index", { email: decoded?.email });
        }

        /*   const tokenResult = await userModel.findOneAndUpdate(
            { email: User[0].email },
            { passwordResetToken: '' }
          );*/
      }
    } else {
      res.send({ message: "Invalid token" });
    }
  } catch (err) {
    res.send({ error: err });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  const SECRET = process.env.SECRET || "";

  //const {token} = req.params

  if (!errors.isEmpty()) {
    // console.log(errors);
    /// logger.error(   JSON.stringify( {method: 'POST', route:'/forgotpassword/:id', err: errors.errors} ));
    return res.render("index", {
      errors: errors,
      email: req.body.email,
    });
  }

  const { password, confirmpassword, email } = req.body;
  console.log(password);

  console.log(confirmpassword);

  const date = new Date();

  if (password !== confirmpassword) {
    return res.render("index", {
      errors: errors,
      email: req.body.email,
    });
  }

  try {
    const User = await userModel.find({
      email: email,
    });

    if (User.length > 0) {
      console.log(User);

      const hashPassword = await bcrypt.hash(password, 10);

      const result = await userModel.findOneAndUpdate(
        { email: email },
        {
          password: hashPassword,
          passwordChangedAt: date,
          passwordResetToken: "",
        },
        { new: true }
      );

      return res.render("success", {
        message: "success",
      });

      // return res.send({registration:false, message:"Email already exists"})
    } else {
      res.send({
        passwordChanged: false,
        message: "Wrong email",
      });
    }
  } catch (err) {
    console.log(err);

    return res.send({
      passwordChanged: false,
      error: err,
    });
  }
};











export const getAllActiveUsers = async (req: Request, res: Response) => {
  try {
    const AllUsers = await userModel.find({ status: "Active" });

    res.send(JSON.stringify(AllUsers));
  } catch (err) {
    console.log(err);
  }
};

export const getAllInactiveUsers = async (req: Request, res: Response) => {
  try {
    const AllUsers = await userModel.find({ status: "Inactive" });

    res.send(JSON.stringify(AllUsers));
  } catch (err) {
    console.log(err);
  }
};

export const getOneuser = async (req: Request, res: Response) => {
  const { id } = req.params;

  validateMongoID(id);

  try {
    const User = await userModel.findById({ _id: id });

    console.log(User);

    res.send(JSON.stringify(User));
  } catch (err) {
    console.log(err);
  }
};

export const deleteOneuser = async (req: Request, res: Response) => {
  const { id } = req.params;

  console.log(id);

  try {
    const result = await userModel.findByIdAndUpdate(
      { _id: id },
      { status: "Inactive" }
    );

    res.send(JSON.stringify(result));
  } catch (err) {
    console.log(err);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, email, mobile } = req.body;
  const body = req.body;

  console.log(id);

  try {
    const UserMobile = await userModel.find({
      mobile: mobile,
    });

    if (UserMobile.length > 0) {
      throw new Error("Mobile number already exists");
      //res.send({registration:false, message:"Email already exists"})
    }
  } catch (err) {
    console.log(err);
    return res.send({
      updateUser: false,
      message: "Mobile number already exists",
    });
  }

  try {
    const result = await userModel.findByIdAndUpdate(
      { _id: id },
      {
        firstName: firstName,
        lastName: lastName,
        mobile: mobile,
      },
      { new: true }
    );

    console.log(result);

    res.send(JSON.stringify(result));
  } catch (err) {
    console.log(err);
  }
};

//export const changePassword = (req:Request, res:Response) =>{}

