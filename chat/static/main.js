function loadAndDisplayMessages(username) {
    // Make an AJAX request to fetch messages between the logged-in user and the contact
    $.ajax({
        type: "GET",
        url: "/fetch_messages/",
        data: { username: username },
        success: function(data) {
            // Clear previous messages in the chat container
            $(".chat").empty();

            // Sort the messages by timestamp
            data.messages.sort(function(a, b) {
                return new Date(a.timestamp) - new Date(b.timestamp);
            });;

            // Append the sorted messages to the chat container
            $.each(data.messages, function(index, message) {
                var messageWrapper = $("<div>").addClass("message-wrapper");
                var messageContent = $("<p>").text(message.content);
                var messageStatus = $("<div>").addClass("message-status");

                // Add a CSS class to right-align messages sent by the logged-in user
                if (message.sender !== username) {
                    messageContent.addClass("sent-message");
                    // Add message status icon based on the 'read' flag
                    if (message.read) {
                        messageStatus.html('<i class="fas fa-check-double"></i>'); // Two ticks for seen
                    } else {
                        messageStatus.html('<i class="fas fa-check"></i>'); // One tick for sent
                    }
                }

                messageWrapper.append(messageContent);
                messageWrapper.append(messageStatus);

                $(".chat").append(messageWrapper);
            });

        },
        error: function(xhr, status, error) {
            console.error(xhr.responseText);
        }
    });
}


// Add a click event listener to your contact elements
$('body').on('click', '.contact', function() {
    // Get the username from the data-username attribute of the clicked contact
    var receiverUsername = $(this).data('username');
    // Set the value of the hidden input field to the receiver's username
    $('#receiver').val(receiverUsername);
    // Update the username displayed in the chat-info div (optional)
    $('.username').text(receiverUsername);

    // Mark messages as read when a contact is clicked (via AJAX)
    markMessagesAsRead(receiverUsername);

    // Store the currently open chat username
    currentlyOpenChat = receiverUsername;


    // Load and display messages when a contact is clicked
    loadAndDisplayMessages(receiverUsername);
});

// Define a variable to store the currently open chat username
var currentlyOpenChat = null;

// Function to update contacts based on messages
function updateContacts() {
    $.ajax({
        type: "GET",
        url: "/fetch_contacts/",
        cache: false,
        success: function(data) {

            // Sort contacts based on the last_message timestamp
            data.contacts.sort(function(a, b) {
                return new Date(b.last_message) - new Date(a.last_message);
            });

            // Clear the existing contacts list
            $(".contacts").empty();
            // Append the fetched contacts to the list
            $.each(data.contacts, function(index, contact) {

                var contactElement = $("<p>")
                    .addClass("contact")
                    .attr("data-username", contact.username)
                    .html(
                        contact.username +
                        (contact.has_unread_messages && contact.username != currentlyOpenChat ? '<span class="new-message-text">  New Message</span>' : '')
                    );
                $(".contacts").append(contactElement);

                // Check if the chat is currently open and mark messages as read
                if (contact.username === currentlyOpenChat) {
                    // Call a function to mark messages as read for this contact
                    markMessagesAsRead(contact.username);
                }
            });
        },
        error: function(xhr, status, error) {
            console.error("Error fetching contacts:", error);
        }
    });
}

// Function to poll for new messages and update contacts
function pollForMessagesAndContacts() {
    var currentContactUsername = $('.username').text();

    // Fetch and update contacts every second
    updateContacts();

    // Fetch messages
    if (currentContactUsername) {
        loadAndDisplayMessages(currentContactUsername);
    }

    // Poll again after one second (adjust the interval as needed)
    setTimeout(pollForMessagesAndContacts, 1000);
}

// Initial call to start polling
pollForMessagesAndContacts();

// Get the CSRF token from a cookie
var csrftoken = getCookie('csrftoken');

// Function to get the CSRF token from the cookie
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Function to mark messages as read via AJAX
function markMessagesAsRead(receiverUsername) {
    $.ajax({
        url: `/mark_messages_as_read/${receiverUsername}/`, // Correct URL with the username parameter
        method: 'POST',
        headers: {
            'X-CSRFToken': csrftoken // Include the CSRF token in the headers
        },
    });
}


// Load and display messages for the initial selected contact (if any)
var initialContactUsername = $('.contact.selected').data('username');
if (initialContactUsername) {
    loadAndDisplayMessages(initialContactUsername);
}

/// Function to append a new message to the chat container
function appendNewMessage(message) {
    var messageWrapper = $("<div>").addClass("message-wrapper");
    var messageContent = $("<p>").text(message.content).addClass("sent-message");

    // Add message status icon based on the 'read' flag
    var messageStatus = $("<div>").addClass("message-status");
    if (message.read) {
        messageStatus.html('<i class="fas fa-check-double"></i>'); // Two ticks for seen
    } else {
        messageStatus.html('<i class="fas fa-check"></i>'); // One tick for sent
    }

    messageWrapper.append(messageContent);
    messageWrapper.append(messageStatus);

    $(".chat").append(messageWrapper);

    // Scroll to the bottom of the chat container to show the new message
    var chatContainer = $(".chat");
    chatContainer.scrollTop(chatContainer[0].scrollHeight);
}

// Add a submit event listener to the message-form
$('.message-form').submit(function(e) {
    // Prevent the default form submission
    e.preventDefault();

    // Get the form data
    var formData = $(this).serialize();

    // Send an AJAX POST request to the send_message view
    $.ajax({
        type: "POST",
        url: "/send_message/",
        data: formData,
        dataType: 'json', // Set the expected response data type to JSON
        success: function(response) {
            // Handle the response (e.g., display success or error messages)
            if (response.success) {
                // Message sent successfully
                // Append the new message to the chat container
                appendNewMessage(response.message);
                // Clear the message input field
                $('.message').val('');
            } else {
                // Message sending failed, display an error message
                console.error('Error: ' + response.error);
            }
        },
        error: function(xhr, status, error) {
            // Handle AJAX error, display a generic error message
            console.error('An error occurred while sending the message:', error);
        }
    });
});

// Add a click event listener to your search results
$('.search-result').click(function(e) {
    e.preventDefault();

    // Get the username from the data-username attribute of the clicked search result
    var receiverUsername = $(this).data('username');

    // Update the receiver input value and chat username display
    $('#receiver').val(receiverUsername);
    $('.username').text(receiverUsername);

    // Load and display messages when a search result is clicked
    loadAndDisplayMessages(receiverUsername);
});