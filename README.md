# Real-Time Chat Application

## Website: https://esram.pythonanywhere.com/

## Overview

This project is a real-time chat application developed with Django on the back end and JavaScript on the front end. The application offers registration and login of users; a search functionality for other users; messaging in real time; dynamic changing of the username and profile picture; and message encryption to provide security and privacy among the users.
## Distinctiveness and Complexity

### Distinctiveness

This project is different from previous projects in the CS50W course, such as the Network and Mail projects, for the following reasons:

1. **Real-Time Communication**: Unlike static interactions in social networking sites and email clients, this application implements real-time chat functionalities, which allow users to exchange messages instantly without page reloads.
  
2. **Encryption**: Messages in this chat application are encrypted, ensuring that all communications by users are private and secure. This feature is not covered in other projects, that focus more on user interactions than message security.
  
3. **Dynamic User Interaction**: Users can search for others, initiate chats, and see changes to names and profile pictures in real time. This feature requires complex state management and real-time data synchronization, which makes it different from the more static nature of social networks and e-commerce projects.
  
### Complexity


The complexity of the project comes from various advanced features and integrations: 

1. **Real-Time Messaging**: Implementing real-time messaging involves using AJAX polling techniques to simulate real-time updates. This requires careful handling of asynchronous requests and responses.

2. **Encryption**: Ensuring the encryption of messages adds a layer of complexity in both data handling and security. Implementing encryption and decryption on both the client and server sides requires a solid understanding of cryptographic principles and secure coding practices.

3. **Dynamic Updates**: Handling real-time updates for user profiles and message exchanges involves creating a responsive and interactive user interface. The front end must dynamically update without reloading the page, which requires advanced JavaScript techniques.

4. **Device Responsiveness**: The application is also designed to be device-responsive, ensuring a consistent user experience across different devices and screen resolutions.

## File Descriptions
`chat/views.py`: This file contains the view functions that handle the logic in the application. The primary functionalities include:

- **User Authentication**: Handles user registration, login, and logout.
- **User Search**: Handles the search for new users to chat with.
- **Contact Fetching**: Fetches all of the contacts the user has previously messaged. Indicates if there are any unread messages and provides the last message in the chat. 
- **Real-Time Messaging**: Fetches the previous messages in the open chat, and handles sending and receiving messages in real-time by using encryption and decryption techniques.
- **Profile Updates**: Handles the username and profile picture updates.

`chat/urls.py`: Contains the URL routing configuration for the project.

`chat/models.py`: Contains the models that define the database schema, including the User, Message, and Profile models.

`chat/templates/layout.html`: Contains the HTML layout that is used for all other templates in this project.

`chat/templates/index.html`: Contains the main HTML template that includes containers for the contacts list, the current open chat, the user profile, and the overlay container that appears when the user profile is selected.

`chat/templates/search_results.html`: Used to display the results of a user search within the application.

`chat/templates/login.html`: Used to display the login page.

`chat/templates/registration.html`: Used to display the registration page.

`chat/static/styles.css`: CSS file for styling the chat application.

`chat/static/main.js`: JavaScript file that is responsible for:

- **Message Handling**: Handles the AJAX request for sending and receiving messages. Adds the new messages to the chat, maintains the scroll position, and marks messages as read.

- **Contact Management**: Handles the AJAX request for retrieving and updating the contact list, sorting by the most recent message, and showing new message indicators.

- **Search Functionality**: Handles the AJAX request for searching for new users and updating the search result list dynamically while the user types.

`chat/static/profile.js`: JavaScript file that is responsible for opening and closing the profile window; toggling the edit profile menu; changing the username; uploading, updating, and removing the profile picture using AJAX requests.

`requirements.txt`: List of Python packages required to run the application.

## How to Run the Application

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Esra-M/CS50Web_Final_Project.git

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt

3. **Apply Migrations**
   ```bash
   python manage.py migrate

4. **Run the Development Server**
   ```bash
   python manage.py runserver

5. **Open a Web Browser**
   ```bash
   http://127.0.0.1:8000/

