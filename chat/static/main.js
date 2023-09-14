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
            });

            // Append the sorted messages to the chat container
            $.each(data.messages, function(index, message) {
                var messageContent = $("<p>").text(message.content);
                $(".chat").append(messageContent);
            });
        },
        error: function(xhr, status, error) {
            console.error(xhr.responseText);
        }
    });
}

// Function to update contacts based on messages
function updateContacts() {
    $.ajax({
        type: "GET",
        url: "/fetch_contacts/",
        cache: false,
        success: function(data) {
            console.log(data)
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
                        '<span class="last-message-timestamp">' +
                        (contact.last_message ? '       : ' + contact.last_message : 'No Messages') +
                        '</span>'
                    );
                $(".contacts").append(contactElement);
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
    setTimeout(pollForMessagesAndContacts, 2000);
}

// Initial call to start polling
pollForMessagesAndContacts();

// Add a click event listener to your contact elements
$('body').on('click', '.contact', function() {
    // Get the username from the data-username attribute of the clicked contact
    var receiverUsername = $(this).data('username');
    // Set the value of the hidden input field to the receiver's username
    $('#receiver').val(receiverUsername);
    // Update the username displayed in the chat-info div (optional)
    $('.username').text(receiverUsername);

    // Load and display messages when a contact is clicked
    loadAndDisplayMessages(receiverUsername);
});

// Load and display messages for the initial selected contact (if any)
var initialContactUsername = $('.contact.selected').data('username');
if (initialContactUsername) {
    loadAndDisplayMessages(initialContactUsername);
}

// Function to append a new message to the chat container
function appendNewMessage(message) {
    var messageContent = $("<p>").text(message.content);
    $(".chat").append(messageContent);

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
        error: function() {
            // Handle AJAX error, display a generic error message
            console.error('An error occurred while sending the message.');
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