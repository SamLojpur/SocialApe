const { admin, db } = require("../util/admin");

const config = require("../util/config");

const firebase = require("@firebase/app").firebase;
const firebaseConfig = require("../util/config");

require("@firebase/auth");
firebase.initializeApp(firebaseConfig);

const { validateSignupData, validateLoginData } = require("../util/validators");

exports.signup = (req, res) => {
  const newUser = {
    confirmPassword: req.body.confirmPassword,
    password: req.body.password,
    handle: req.body.handle,
    email: req.body.email
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  const noImg = "noimg.png";

  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then(data => {
      userId = data.user.uid;

      return data.user.getIdToken();
    })
    .then(_token => {
      token = _token;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${
          config.storageBucket
        }/o/${noImg}?alt=media`,
        userId
      };
      db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
  //TODO validate data
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({ token });
    })
    .catch(err => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again" });
      } else return res.status(500).json;
    });
};

// exports.uploadImage = (req, res) => {
//   const BusBoy = require("busboy");
//   const path = require("path");
//   const os = require("os");
//   const fs = require("fs");

//   const busboy = new BusBoy({ headers: req.headers });

//   let imageToBeUploaded = {};
//   let imageFileName;

//   busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
//     console.log("help");
//     if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
//       return res.status(400).json({ error: "Wrong file type submitted" });
//     }

//     const imageExtension = filename.split(".")[filename.split(".").length - 1];
//     const randomName = Math.round(Math.random() * 1000000).toString();
//     imageFileName = `${randomName}.${imageExtension}`;
//     const filepath = path.join(os.tmpdir(), imageFileName);
//     imageToBeUploaded = { filepath, mimetype };
//     console.log(imageToBeUploaded);

//     file.pipe(fs.createWriteStream(filepath));
//   });

//   busboy.on("finish", () => {
//     admin
//       .storage()
//       .bucket()
//       .upload(imageToBeUploaded.filepath, {
//         resumable: false,
//         metadata: {
//           metadata: {
//             contentType: imageToBeUploaded.mimetype
//           }
//         }
//       })
//       .then(() => {
//         const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
//           config.storageBucket
//         }/o/${imageFileName}?alt=media`;
//         return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
//       })
//       .then(() => {
//         return res.json({ message: "Image uploaded successfully" });
//       })
//       .catch(err => {
//         console.error(err);
//         return res.status(500).json({ error: "something went wrong" });
//       });
//   });
//   busboy.end(req.rawBody);
//   busboy.on("error", err => {
//     console.error("error");
//     console.error(err);
//   });
// };

exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    console.log("1");

    file.pipe(fs.createWriteStream(filepath));
    console.log("2");
  });
  busboy.on("finish", () => {
    console.log("3");
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
          config.storageBucket
        }/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "image uploaded successfully" });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};
