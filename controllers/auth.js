const bcrypt = require("bcryptjs");
const sweetAlert = require("sweetalert2");
const User = require("../models/user");

exports.getLogin = (req, res, next) => {
  // const isLoggedIn = req.get("Cookie").split(';')[0].trim().split('=')[1];
  let message = req.flash('error');
  if(message.length >0){
    message = message[0];
  }else{
    message = null;
  }
  // console.log(req.session);
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    isAuthenticated: false,
    errorMessage:message
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');
  if(message.length >0){
    message = message[0];
  }else{
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    isAuthenticated: false,
    errorMessage:message,
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  User.findOne({ email: email }).then((user) => {
    if (!user) {
      req.flash('error','Invalid email or password');
      return res.redirect("/login");
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
        req.flash('error','Invalid email or password');
        res.redirect("/login");
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
  const confirmPassword = req.body.confirmPassword;

  User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        // return console.log('Use already exist');
        req.flash('error','Email already exist');
       return  res.redirect('/signup');
      }
      return bcrypt
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
        });
    })

    .catch((err) => {
      console.log(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};
