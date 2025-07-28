Saasfy-Workplace Projects Manager

Welcome to Saasfy-Workplace Projects Manager! This is a powerful and intuitive SaaS platform designed to streamline your project management and enhance team collaboration. This full-stack application is built with Python (Flask) and a MySQL database, and is deployed live on Render.

🔴 Live Demo
Check out the live application here: https://saasfy-workplace.onrender.com

✨ Features
🗂️ Project Management: Create and manage all your projects from a single, beautiful dashboard.

🎨 Visual Kanban Boards: Use drag-and-drop Kanban boards to visualize your workflow and track progress from "To Do" to "Done".

🤝 Team Collaboration: Invite your team, assign tasks, and keep everyone in the loop, effortlessly.

✅ Task Management: Create, edit, and prioritize tasks with details such as due dates and assignees.

⚡ Real-Time Updates: Experience a fully dynamic interface where changes are reflected instantly for all team members.

🔒 Secure User Authentication: Secure user registration and login functionality to protect your project data.

📱 Fully Responsive Design: Manage your projects on the go from any device—desktop, tablet, or mobile.

🛠️ Tech Stack
Backend: Python, Flask

Frontend: HTML, CSS, JavaScript

Database: MySQL

Deployment: Render (Web Service), Aiven (Database Hosting)

WSGI Server: Gunicorn

Libraries:

Flask-Bcrypt

mysql-connector-python

Flask-Session

⚙️ Local Development Setup
To get a local copy up and running, follow these simple steps.

Prerequisites
Python 3.x

MySQL Server

Installation
Clone the repository

git clone https://github.com/rishikeshbrahma/saas-landing-page.git
cd saas-landing-page

Create and activate a virtual environment

# For Windows
python -m venv venv
.\venv\Scripts\Activate.ps1

# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

Install dependencies

pip install -r requirements.txt

Set up your local database

Make sure your local MySQL server is running.

Create a database (e.g., saas_landing).

Update the database credentials in config.py to match your local setup.

Run the application

python app.py

The application will be running at http://127.0.0.1:5000.

🚀 Deployment to Render
This application is deployed on Render using a Gunicorn server and an external MySQL database hosted on Aiven.

1. Prepare for Production
WSGI Server: Ensure gunicorn is in your requirements.txt file.

Entry Point: Create a wsgi.py file in your root directory:

from app import app

if __name__ == "__main__":
    app.run()

Database Port: Modify app.py to accept the port as a separate environment variable.

# app.py
import os

db_pool = mysql.connector.pooling.MySQLConnectionPool(
    # ... other settings
    port=os.environ.get('MYSQL_PORT'),
    # ... other settings
)

2. Set up an External Database
Since Render no longer offers a free MySQL tier, you can use a free external database from a provider like Aiven or Free MySQL Hosting.

Create a free MySQL database on your chosen platform.

Gather the connection details: Host, Port, Database Name, User, and Password.

3. Deploy on Render
Create a New Web Service on Render and connect it to your GitHub repository.

Configure the Settings:

Runtime: Python 3

Build Command: pip install -r requirements.txt

Start Command: gunicorn wsgi:app

Add Environment Variables: In the "Environment" tab, add the following variables using the credentials from your external database.

Key

Value

PYTHON_VERSION

3.11.0 (or your desired version)

SECRET_KEY

Your own long, random, secret string

MYSQL_HOST

The hostname from your database provider

MYSQL_PORT

The port number from your database provider

MYSQL_DB

The database name from your database provider

MYSQL_USER

The username from your database provider

MYSQL_PASSWORD

The password from your database provider

Deploy: Save your changes and trigger a manual deployment. Render will build and launch your application.
Saasfy-Workplace Projects Manager
Saasfy-Workplace Projects Manager is a powerful and intuitive SaaS platform designed to streamline your project management and enhance team collaboration. This application provides a seamless experience for organizing workflows, managing tasks, and keeping your team in sync, all from a single dashboard.

Features
Project Management: Create and manage all your projects from a centralized and user-friendly dashboard.

Visual Kanban Boards: Utilize drag-and-drop Kanban boards to visualize your workflow and track the progress of tasks from "To Do" to "Done".

Team Collaboration: Invite members to your projects, assign tasks, and keep everyone on the same page.

Task Management: Create, edit, and prioritize tasks with details such as due dates and assignees.

Real-Time Updates: The dynamic interface ensures that any changes are reflected instantly for all team members.

User Authentication: Secure user registration and login functionality to protect your project data.

Responsive Design: Manage your projects on the go from any device, thanks to a fully responsive layout.

Technologies Used
Backend: Python, Flask

Frontend: HTML, CSS, JavaScript

Database: MySQL

Libraries:

Flask-Bcrypt for password hashing

Flask-MySQLdb for database connection

Sortable.js for drag-and-drop functionality

Setup and Installation
To get a local copy up and running, follow these simple steps.

Prerequisites
Python 3.x

MySQL Server

Installation
Clone the repo

Bash

git clone https://github.com/rishikeshbrahma/saas-landing-page.git
Create a virtual environment

Bash

python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
Install dependencies

Bash

pip install -r requirements.txt
Set up the database

Make sure your MySQL server is running.

Create a database named saas_landing.

Update the database credentials in config.py to match your MySQL setup:

Python

class Config:
    # ...
    MYSQL_HOST = 'localhost'
    MYSQL_USER = 'your_mysql_user'
    MYSQL_PASSWORD = 'your_mysql_password'
    MYSQL_DB = 'saas_landing'
Create the necessary tables by executing the SQL statements in database.sql.

Run the application

Bash

python app.py
The application will be running at http://127.0.0.1:5000.

Usage
Sign Up: Create a new account to get started.

Login: Access your dashboard by logging in with your credentials.

Create a Project: From the projects page, create a new project to house your tasks.

Manage Tasks: In the project dashboard, you can:

Add new tasks to the "To Do" column.

Drag and drop tasks between "To Do", "In Progress", and "Done" columns.

Click on a task to view and edit its details, add subtasks, and leave comments.

Invite Members: As the project owner, you can invite other registered users to collaborate on your projects.

File Structure
/
|-- app.py              # Main Flask application
|-- config.py           # Configuration file
|-- requirements.txt    # Python dependencies
|-- static/
|   |-- css/
|   |   `-- style.css   # Main stylesheet
|   `-- js/
|       |-- script.js   # JS for landing page
|       |-- projects.js # JS for projects page
|       `-- dashboard.js# JS for dashboard
|-- templates/
|   |-- index.html      # Landing page
|   |-- projects.html   # User's projects page
|   `-- dashboard.html  # Project dashboard
`-- test_db.py          # DB connection test script
Enjoy managing your projects with Saasfy-Workplace! 🎉
