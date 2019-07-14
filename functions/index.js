const functions = require("firebase-functions");

const app = require("express")();

const FBAuth = require("./util/FBAuth");

const {
  getAllScreams,
  postScream,
  getScream,
  commentOnScream,
  likeScream,
  unlikeScream
} = require("./handlers/screams");
const {
  signup,
  login,
  uploadImage,
  addUserDetails
} = require("./handlers/users.js");

app.get("/screams", getAllScreams);
app.post("/scream", FBAuth, postScream);
app.get("/scream/:screamId", getScream);
app.post("/scream/:screamId/comment", FBAuth, commentOnScream);
app.post("/scream/:screamId/like", FBAuth, likeScream);
app.post("/scream/:screamId/unlike", FBAuth, unlikeScream);

app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);

exports.api = functions.https.onRequest(app);
