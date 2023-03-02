// Importing Modules
const express = require('express');
const app = express();
const http = require('http');
http.createServer(app)
const mysql = require('mysql');
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require('connect-flash');

// Flash Messages
app.use(flash());

// Sessions
app.use(session({
    secret: 'secret cat is under 75684',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 6000000,
        sameSite: 'lax'
    }
}));

app.use(express.urlencoded());
app.use(express.json());

app.use(bodyParser.urlencoded({
    extended: true
}));

// MySQL Connection
var conn = mysql.createPool({
    connectionLimit: 50,
    host: "localhost",
    user: "root",
    password: "",
    database: "mit"
});

/**bodyParser.json(options)
 * Parses the text as JSON and exposes the resulting object on req.body.
 */
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.listen(process.env.PORT || 8080);

// Root Route
app.get('/', (req, res) => {
    if (req.session.id) {
        res.render('index', { isLoggedIn: req.session.loggedIn, username: req.session.username });
    } else {
        console.log("this one");
        res.render('index', { isLoggedIn: req.session.loggedIn });
    }

});

// Login
app.get('/login', (req, res) => {
    res.render('login',{msg:req.flash("err")});
});

// Login Checking
app.post('/login_check', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    conn.query(`SELECT * FROM student WHERE email = ? AND student_password = ?`, [email, password], (err, result, fields) => {
        if (err) throw err;
        if (result.length > 0) {
            req.session.loggedIn = true;
            req.session.username = result[0]["student_name"];
            req.session.role = result[0]["role"];
            req.session.save(function (err) {
                if (err) return next(err);
            });
            if (result[0]["role"] == "admin") {
                res.redirect('/admin');
            } else {
                res.redirect('/');
            }
        } else {
            req.flash("err","Invalid Email or Password!")
            res.redirect("/login");
        }
    });
});

// Admin
app.get('/admin', (req, res) => {
    if (req.session.role == "admin") {
        updateTotalStudents();
        res.redirect('/admin/dashboard');
    } else {
        res.redirect('/login');
    }
});

// Admin Dashboard
app.get('/admin/dashboard', (req, res) => {
    if (req.session.role != "admin") {
        res.redirect('/login');
    } else {
        res.render('dashboard');
    }
});

// Admin Show Students
app.get("/admin/show-all-students", (req, res) => {
    conn.query(`SELECT * FROM student INNER JOIN class ON student.class_id = class.class_id`, (err, rows, fields) => {
        if (err) throw err;
        if (rows.length > 0) {
            req.session.students = rows;
            req.session.save((err) => {
                if (err) throw err;
            });
        }
        if (req.session.role != "admin") {
            res.redirect('/login');
        } else {
            res.render('show-all-students', { students: req.session.students });
        }
    });
});

// Admin Show Single Student
app.post("/admin/show-student", (req, res) => {
    var id = req.body.std_id;
    conn.query(`SELECT * FROM student WHERE student_id = ?`, [id], (err, rows, fields) => {
        if (err) throw err;
        if (rows.length > 0) {
            if (req.session.role != "admin") {
                res.redirect('/login');
            } else {
                res.render('show-student', { student: rows});
            }
        }
    });
    
});

// Admin Show Classes
app.get("/admin/show-all-classes", (req, res) => {
    conn.query(`SELECT * FROM class`, (err, rows, fields) => {
        if (err) throw err;
        if (rows.length > 0) {
            req.session.classes = rows;
            req.session.save((err) => {
                if (err) throw err;
            });
        }
        if (req.session.role != "admin") {
            res.redirect('/login');
        } else {
            res.render('show-all-classes', { classes: req.session.classes });
        }
    });

});

// Delete Student
app.post('/delete_student', (req, res) => {
    var std_id = req.body.std_id;
    conn.query(`DELETE FROM student WHERE student_id = ?`, [std_id], (err, rows, fields) => {
        if (err) throw err;
    });
    updateTotalStudents();
    res.redirect('/admin/show-all-students');
});

// Log Out
app.get('/logout', (req, res) => {
    req.session.destroy(function (err) { if (err) throw err; });
    res.redirect('/');
});

// Sign Up
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Fixed
const techs = new Array("Computer Information Technology", "Electrical Technology", "Mechanical Technology", "Civil Technology");
const classes = new Array("1st-Year", "2nd-Year", "3rd-Year");

// Sign Up Checking
app.post('/signup_check', (req, res) => {
    var name = req.body.name;
    var father_name = req.body.father_name;
    var roll = req.body.roll;
    var technology = req.body.technology;
    var Class = req.body.class;
    var email = req.body.email;
    var phone = req.body.phone;
    var dob = req.body.dob;
    var pwd = req.body.pwd;
    var confirm_pwd = req.body.confirm_pwd;

    if (roll.length != 5) {
        res.redirect('/signup');
    }
    console.log("Passed");
    if (check_tech(techs, technology)) {
        res.redirect('/signup');
    }
    console.log("Passed");
    if (check_tech(classes, Class)) {
        res.redirect('/signup');
    }
    console.log("Passed");
    if (phone.length != 11 && phone.length != 10) {
        res.redirect('/signup');
    }
    console.log("Passed");
    var current_date = new Date();
    if (dob > current_date.getDate()) {
        res.redirect('/signup');
    }
    console.log("Passed");
    if (pwd != confirm_pwd) {
        res.redirect('/signup');
    }
    conn.query(`SELECT * FROM class WHERE class_name = ? AND class_technology = ?`, [Class, technology], (err, result, fields) => {
        if (err) throw err;
        if (result.length > 0) {
            req.session.class_id = result[0]["class_id"];
            CLASS_ID = req.session.class_id;
            req.session.save((err) => { if (err) throw err; });
        } else {
            res.redirect('/signup');
        }
    });

    var query = `INSERT INTO mit.student(student_roll, student_name, student_father_name, student_password, class_id, role, fee_id, reg_no, email, phone, attendence_id, date_of_birth) VALUES (?)`;
    var values = [
        roll, name, father_name, pwd, CLASS_ID, 'basic', '1', '54321', email, phone, '1', dob
    ];
    conn.query(query, [values], (error, result, fields) => {
        if (error) { throw error; }
        res.redirect('/login');
    });

});

// REST API for getting Students (* Can be Fetched from Client Side JavaScript using fetch() *)
app.get("/get-students", (req, res) => {
    conn.query(`SELECT * FROM student INNER JOIN class ON student.class_id = class.class_id`, (err, rows, fields) => {
        if (err) throw err;
        if (rows.length > 0 && req.session.username) {
            res.send(rows);
        }
    });
});

// Updating Students in the Database
function updateTotalStudents() {
    techs.forEach((tech) => {
        classes.forEach((Class) => {
            conn.query(`SELECT student_name FROM student INNER JOIN class ON student.class_id = class.class_id WHERE class_name = ? AND class_technology = ?`, [Class, tech], async (err, rows, fields) => {
                if (err) throw err;
                await conn.query(`UPDATE class SET class_students = ? WHERE class_name = ? AND class_technology = ?`, [rows.length, Class, tech], (err, result) => {
                    if (err) throw err;
                });
            });
        });
    });
}

// Function for checking an item in a List
function binSearch(list, target) {
    var l = 0;
    var r = list.length - 1;

    while (l <= r) {
        var m = Math.ceil((l + r) / 2);
        if (list[m] == target) {
            return true;
        } else if (list[m] < target) {
            l = m + 1;
        } else {
            r = m - 1;
        }
    }
    return false;
}


