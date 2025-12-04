const HTTP_PORT = process.env.PORT || 8080;

const express = require("express");
const app = express();
app.use(express.static(__dirname + '/public')) // css files
app.set("view engine", "ejs");      //ejs
app.set('views', __dirname + '/views') 
app.use(express.urlencoded({ extended: true })); //forms

require("dotenv").config()   

// +++ 2. Required!
const mongoose = require('mongoose')


// TODO:  Add a departments collection
// what a document in the departments collection looks like (structure)
// property name: data type
const deptSchema = new mongoose.Schema({
   name:String,
   location:String
})
const Dept = new mongoose.model("departments", deptSchema)


const employeeSchema = new mongoose.Schema({
   name:String,
   isManager:Boolean,
   hourlyRate:Number,
   // refernece to a documetn in the departments collection
   dept:{ type: mongoose.Schema.Types.ObjectId, ref: "departments" }
})
const Employee = new mongoose.model("employees", employeeSchema)


const session = require('express-session')
app.use(session({
   secret: "the quick brown fox jumped over the lazy dog 1234567890",  // random string, used for configuring the session
   resave: false,
   saveUninitialized: true
}))

// -------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------
app.get("/", async (req, res) => {    
    console.log(req.sessionID)    
    // return res.send(`Session id is: ${req.sessionID}`)
    return res.render("home.ejs")
})

app.get("/employees", async (req,res)=>{
    const results = 
        await Employee.find().populate("dept")
    return res.render("employees.ejs", {empList:results})        
})

// show the Add Employee Form
app.get("/employees/add", async (req,res)=>{
    const results = await Dept.find()
    return res.render("add.ejs", {depts:results})
})
app.post("/employees/insert", async (req,res)=>{

    // convert the checkbox to a boolean
    let managerStatus = false
    if (req.body.cbIsManager === undefined) {
        managerStatus = false
    } else {
        managerStatus = true
    }

    await Employee.create({
        name: req.body.txtName,
        isManager:managerStatus,
        // convert the form value to a number
        hourlyRate: parseFloat(req.body.txtHourlyRate),
        // you can pass the id of the department document here
        dept: req.body.selDept
    })

    // after creating, go back to all employees page
    return res.redirect("/employees")
})

// remove someone from a department
app.get("/remove/:docId", async (req,res)=>{    
    await Employee.findByIdAndUpdate(req.params.docId, { $unset: {dept:""}})
    return res.redirect("/employees")
})


// helper function to populate your database the first time (dept collection)
const populateDatabase = async () => {

    const count = await Dept.countDocuments()

    if (count === 0) {
        const marketingDept = await Dept.create({name:"Marketing", location:"Vancouver"})    
        const salesDept = await Dept.create({name:"Sales", location:"Montreal"})    
        const engineeringDept = await Dept.create({name:"Engineering", location:"Toronto"})    

        // bcause a need that reference to assign a dept to an employee
        await Employee.insertMany([
           { name: 'Max', isManager: true, hourlyRate:99.99, dept:salesDept},
           { name: 'Nyasha', isManager: true, hourlyRate:125.00, dept:engineeringDept },
           { name: 'Otto', isManager: false, hourlyRate:200.00 },
           { name: 'Pauline', isManager: false, hourlyRate:5100.00},          
       ]);

       // Employee
        await Employee.create({name:"Rudy", isManager:false, hourlyRate:100, dept:marketingDept})    

        console.log("Employees and depts created")


    } else {
        console.log("ERROR:Dept collection already has data, so skipping")
    }
 
}


// +++  5. Create a function that connects to the database BEFORE starting the Express web server.
async function startServer() {    
    try {    

        // +++ 5a. Attempt to connnect to the database using the database connection information you defined in step #2
        await mongoose.connect(process.env.MONGODB_URI)

        // +++ 5b. If tables do not exist in the db, then Mongo will automatically create them

        // +++ 5c. Prepopulate your collections with some data
        populateDatabase()


        // +++ 5c.  If db connection successful, output success messages. If fail, go to 5d.
        console.log("SUCCESS connecting to MONGO database")
        console.log("STARTING Express web server")        
        
        // +++ 5d.  At this point, db connection should be successful, so start the web server!
        app.listen(HTTP_PORT, () => {     
            console.log(`server listening on: http://localhost:${HTTP_PORT}`) 
        })    
    }
    // +++ 5d. The catch block executes if the app fails to connect to the database     
    catch (err) {        
        console.log("ERROR: connecting to MONGO database")
        // +++ 5e. Output the specific error message
        console.log(err)
        console.log("Please resolve these errors and try again.")
    }
}
// +++ 6. Execute the function
startServer()



