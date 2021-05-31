exports.getLogin = (req, res, next) => {
  // const isLoggedIn = req.get("Cookie").split(';')[0].trim().split('=')[1];
  console.log(req.session);
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    isAuthenticated:false,
  });
};

exports.postLogin = (req, res, next) => {
  req.session.isLoggedIn = true;
  // res.setHeader("Set-Cookie", "loggedIn=true");
  res.redirect("/");
};
