app.get("/cookie", function (req, res) {
  let minute = 60 * 1000;
  res.cookie(cookie_name, "cookie_value", { maxAge: minute });
  return res.send("cookie has been set!");
});
