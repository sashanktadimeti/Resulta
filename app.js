const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require('connect-mongodb-session')(session);
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const Student = require("./models/studentmodel.js");
const Teacher = require("./models/teachermodel.js");
const adminteacher = require("./models/adminteachermodel.js");
const adminstudent = require("./models/adminstudentmodel.js");
const evaluationschema = require("./models/reevaluations.js");
const newModel = require("./models/displaymodel.js");

const app = express();
const DATABASE_URL = ""

const store = new MongoDBStore({
    uri: DATABASE_URL,
    collection: "sessions"
});

async function databaseconnection() {
    try {
        await mongoose.connect(DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Database connected successfully");
    } catch (err) {
        console.log("connection failed due to:" + err);
    }
}

databaseconnection();

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: "this is a secret",
    resave: false,
    saveUninitialized: false,
    store: store
}));

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    const { emailid, passwordkey, candid } = req.body;
    let userexists = "";

    if (candid == "admin") {
        req.session.isAuthorized = true;
        res.redirect('/dashboard');
    } else if (candid == "student") {
        userexists = await Student.findOne({ email: emailid });
    } else if (candid == "teacher") {
        userexists = await Teacher.findOne({ email: emailid });
    }

    if (!userexists && candid != "admin") {
        res.redirect('/register');
    } else if (candid != "admin") {
        const match = bcrypt.compareSync(passwordkey, userexists.password);
        if (!match) {
            res.redirect('/login');
        } else {
            console.log(candid);
            candid == "student" ? req.session.isStudent = true : req.session.isTeacher = true;
            candid == "student" ? res.redirect('/loggedinstudent/' + userexists.admissionnumber) : res.redirect('/loggedinteacher?subject=' + userexists.subject);
        }
    }
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async function (req, res) {
    try {
        let username = req.body.name;
        let emailid = req.body.emailid;
        let password = req.body.passwordkey;
        let person = req.body.person;
        let subject = req.body.subject;
        var salt = bcrypt.genSaltSync(10);
        var hashedpassword = bcrypt.hashSync(password, salt);

        if (person == "teacher") {
            const data = {
                name: username,
                email: emailid,
                password: hashedpassword,
                subject: req.body.subject,
            };
            const match = await adminteacher.findOne({ name: username, subject: req.body.subject });
            if (match) {
                const teacher = new Teacher(data);
                await teacher.save();
                req.session.isTeacher = true;
                res.redirect('/loggedinteacher?subject=' + req.body.subject);
            } else {
                res.redirect('/login');
            }
        } else if (person == "student") {
            const data = {
                name: username,
                email: emailid,
                password: hashedpassword,
                admissionnumber: req.body.rollno
            };
            const match = await newModel.findOne({ name: username, rollno: req.body.rollno });
            if (match) {
                const student = new Student(data);
                console.log("hi")
                await student.save();
                req.session.isStudent = true;
                res.redirect('/loggedinstudent/' + data.admissionnumber);
            } else {
                res.redirect('/login');
            }
        }

    } catch (err) {
        console.log(err);
    }
});

app.get("/", (req, res) => {
    res.render("welcome");
});

const middleware1 = (req, res, next) => {
    if (req.session.isAuthorized) {
        next();
    } else {
        res.redirect("/register");
    }
};

app.get("/dashboard", middleware1, (req, res) => {
    res.render('dashboard');
});

app.post("/dashboard/:id", async (req, res) => {
    const { id } = req.params;
    if (id == "student") {
        const data = {
            name: req.body.name,
            rollno: req.body.rollno
        };
        await adminstudent.insertMany([data]);
        await newModel.insertMany([{ name: req.body.name, rollno: req.body.rollno, section: req.body.section }]);
        res.json("succesful");
    } else {
        const data = {
            name: req.body.name,
            subject: req.body.subject
        };
        await adminteacher.insertMany([data]);
        res.json("succesful");
    }
});

const teachermiddleware = async (req, res, next) => {
    if (req.session.isTeacher) {
        next();
    }
};

app.get("/loggedinteacher", teachermiddleware, async (req, res) => {
    const queryparams = req.query.subject;
    const results = await newModel.find({});
    res.render('loggedinteacher', { data: results, subject: queryparams });
});

app.post('/loggedinteacher/:subject', async (req, res) => {
    if (req.body.rollnumber) {
        const queryparams = req.params.subject;
        const results = await newModel.find({ rollno: req.body.rollnumber });
        res.render('loggedinteacher', { data: results, subject: queryparams });
    }
});

app.get('/loggedinstudent/:admissionnumber', async (req, res) => {
    const result = await newModel.find({ rollno: req.params.admissionnumber });
    res.render('loggedinstudent', { data: result });
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
