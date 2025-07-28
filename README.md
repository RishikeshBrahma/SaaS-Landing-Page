🚀 Saasfy-Workplace Projects Manager 🚀
Welcome to Saasfy-Workplace Projects Manager! ✨ This is a powerful and intuitive platform designed to streamline your project management and boost team collaboration. Say goodbye to scattered notes and hello to organized, efficient workflows!

✨ Features
🗂️ Project Management: Create and manage all your projects from a single, beautiful dashboard.

🎨 Visual Kanban Boards: Use drag-and-drop Kanban boards to visualize your workflow and track progress from "To Do" to "Done".

🤝 Team Collaboration: Invite your team, assign tasks, and keep everyone in the loop, effortlessly.

✅ Task Management: Create, edit, and prioritize tasks with due dates and assignees.

⚡ Real-Time Updates: Experience a fully dynamic interface where changes are reflected instantly for all team members.

🔒 User Authentication: Secure user registration and login to keep your projects safe.

📱 Responsive Design: Manage your projects on the go from any device—desktop, tablet, or mobile.

🛠️ Technologies Used
Backend: Python, Flask

Frontend: HTML, CSS, JavaScript

Database: MySQL

Libraries:

Flask-Bcrypt for password hashing

Flask-MySQLdb for database connection

Sortable.js for awesome drag-and-drop functionality

⚙️ Setup and Installation
Get your local copy up and running in a few simple steps.

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

Usage Guide
Sign Up: Create a new account to get started.

Login: Access your dashboard by logging in with your credentials.

Create a Project: From the projects page, create a new project to house your tasks.

Manage Tasks: In the project dashboard, you can:

Add new tasks to the "To Do" column.

Drag and drop tasks between "To Do", "In Progress", and "Done" columns.

Click on a task to view and edit its details, add subtasks, and leave comments.

Invite Members: As the project owner, you can invite other registered users to collaborate on your projects.

🎨 Fonts and Design
This project uses the beautiful and highly readable Inter font, which is included in the style.css file. The overall design is modern, clean, and user-friendly, with a focus on a great user experience.

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
