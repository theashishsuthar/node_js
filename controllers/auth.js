const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendGridMailer = require("nodemailer-sendgrid-transport");
const {validationResult} = require('express-validator/check')

const User = require("../models/user");

const transporter = nodemailer.createTransport(
  sendGridMailer({
    auth: {
      api_key:
        "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",
    },
  })
);
exports.getLogin = (req, res, next) => {
  // const isLoggedIn = req.get("Cookie").split(';')[0].trim().split('=')[1];
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  // console.log(req.session);
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    isAuthenticated: false,
    errorMessage: message,
    validationError:[],
    oldInput:{
      email:'',
      password:''
    }
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    isAuthenticated: false,
    errorMessage: message,
    oldInput : {
      email:'',
      password : '',
      confirmPassword:''
    },
    validationError : []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);

  if(!errors.isEmpty()){
    console.log(errors);
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput : {
        email:email,
        password : password,
      },
      validationError : errors.array()
    });
  }

  User.findOne({ email: email }).then((user) => {
    if (!user) {
      return res.status(422).render("auth/login", {
        path: "/login",
        pageTitle: "Login",
        errorMessage:'Invalid email or password',
        oldInput : {
          email:email,
          password : password,
        },
        validationError : errors.array()
      });
    }

    bcrypt
      .compare(password, user.password)
      .then((doMatch) => {
        if (doMatch) {
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save((err) => {
            console.log(err);
            res.redirect("/");
          });
        }
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage:'Invalid email or password',
          oldInput : {
            email:email,
            password : password,
          },
          validationError : errors.array()
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

const alertDialog = () => {
  Swal.fire({
    title: "This user already exist",
    cancelButtonAriaLabel: true,
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if(!errors.isEmpty()){
    console.log(errors);
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      isAuthenticated: false,
      errorMessage: errors.array()[0].msg,
      oldInput : {
        email:email,
        password : password,
        confirmPassword:req.body.confirmPassword
      },
      validationError : errors.array()
    });
  }

  
      bcrypt
        .hash(password, 12)
        .then((hasedPassword) => {
          const user = new User({
            email: email,
            password: hasedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then((result) => {
          res.redirect("/login");
          return transporter.sendMail({
            to: email,
            from: "www.gajjarashish5656@gmail.com",
            subject: "Sucessfully signup",

            html: "<h1>You have succesfully created account</h1>",
          });
        })
        .catch((err) => console.log(err));
  

};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset password",
    isAuthenticated: false,
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found.");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        res.redirect("/");
        transporter.sendMail({
          to: req.body.email,
          from: "www.gajjarashish5656@gmail.com",
          subject: "Password reset",
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
          `,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });
};


exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then(user => {
      let message = req.flash('error');
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken:token
      });
    })
    .catch(err => {
      console.log(err);
    });
};


exports.postNewPassword = (req,res,next)=>{
  const newpassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  let resetUser;

  User.findOne({
    resetToken:passwordToken,
    resetTokenExpiration:{$gt:Date.now()},
    _id:userId
  })
  .then(user=>{
    resetUser = user;
    return bcrypt.hash(newpassword,12)
  })
  .then(hashedPassword=>{
    resetUser.password = hashedPassword;
    resetUser.resetToken = undefined;
    resetUser.resetTokenExpiration = undefined;
    return resetUser.save()
  })
  .then(result=>{
    res.redirect('/login')
  }).catch(err=>
    console.log(err)
  )
}