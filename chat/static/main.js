var currentContactID = null;
var currentScrollPosition = null;
var messagesLimit = 30;
var messagesOffset = 0;

async function loadAndDisplayMessages(username, limit, offset) {
    // Make an AJAX request to fetch messages between the logged-in user and the contact
    $.ajax({
        type: "GET",
        url: "/fetch_messages/",
        data: { username: username, limit: limit, offset: offset },
        success: function(data) {

            var prevScrollHeight = $(".chat")[0].scrollHeight;

            $(".chat").empty();

            // Append the sorted messages to the chat container
            $.each(data.messages, function(index, message) {
                var messageWrapper = $("<div>").addClass("message-wrapper");
                var messageContent = $("<p>").text(message.content);
                var messageStatus = $("<div>").addClass("message-status");
                var currentUserUsername = $(".profile-username").text();

                // Add a CSS class to right-align messages sent by the logged-in user
                if (message.sender !== username || username === currentUserUsername) {
                    messageContent.addClass("sent-message");
                    // Add message status icon based on the 'read' flag
                    if (message.read) {
                        messageStatus.html('<i class="fas fa-check-double"></i>'); // Two ticks for seen
                    } else {
                        messageStatus.html('<i class="fas fa-check"></i>'); // One tick for sent
                    }
                } else {
                    messageContent.addClass("received-message");
                }

                messageWrapper.append(messageContent);
                messageWrapper.append(messageStatus);

                // Append the message wrapper to the chat container
                $(".chat").append(messageWrapper);
            });

            var newScrollHeight = $(".chat")[0].scrollHeight;
            var scrollHeightDifference = newScrollHeight - prevScrollHeight;

            // Restore the previous scroll position if available
            if (currentScrollPosition !== null) {
                if (scrollHeightDifference > 0) {
                    $(".chat").scrollTop($(".chat").scrollTop() + scrollHeightDifference);
                } else {
                    $(".chat").scrollTop(currentScrollPosition);
                }
            } else {
                // Scroll to the bottom of the chat container if no previous scroll position
                var chatContainer = $(".chat");
                chatContainer.scrollTop(chatContainer[0].scrollHeight);
            }
        },
        error: function(xhr, status, error) {
            console.error(xhr.responseText);
        }
    });
}

$(".chat").on("scroll", function() {
    // Get the current scroll position
    currentScrollPosition = $(this).scrollTop();

    // Check if the user has scrolled to the top
    if (currentScrollPosition === 0) {
        // Load more messages when user scrolls to the top
        if (currentContactID) {
            messagesOffset += messagesLimit;
            var currentContactUsername = $('.contact.selected').data('username');
            loadAndDisplayMessages(currentContactUsername, messagesLimit, messagesOffset);
        }
    }
});

function fetchUserName(userID) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: 'GET',
            url: `/get_user_name/${userID}/`,
            success: function(response) {
                if (response && response.user_name) {
                    resolve(response.user_name);
                } else {
                    reject('User not found');
                }
            },
            error: function(xhr, status, error) {
                reject('Error fetching user name');
            }
        });
    });
}


// Add a click event listener to your contact elements
$('body').on('click', '.contact', function(event) {
    event.preventDefault(); // Prevent the default action

    // Remove the 'selected' class from all contacts
    $('.contact').removeClass('selected');

    // Check if the clicked contact had a 'new-message-indicator'
    if ($(this).find('.new-message-indicator').length) {
        // Remove the 'new-message-indicator' from the clicked contact
        $(this).find('.new-message-indicator').remove();
    }

    // Add the 'selected' class to the clicked contact
    $(this).addClass('selected');

    const handleContactClick = async() => {
        try {
            currentContactID = $(this).data('id');
            var currentContactUsername = await fetchUserName(currentContactID);
            $('#receiver').val(currentContactUsername);
            $('.message-form').show();
            $('#message-input').val("");
            $("#message-input").focus();

            currentScrollPosition = null;
            messagesOffset = 0;
            markMessagesAsRead(currentContactUsername);
            await loadAndDisplayMessages(currentContactUsername, messagesLimit, messagesOffset);

        } catch (error) {
            console.error(error);
        }
    };

    handleContactClick();

    // Update chat info based on the selected contact
    updateChatInfo();
});

// Function to update chat info based on the selected contact
function updateChatInfo() {
    // Check if a contact is selected
    if (currentContactID) {
        // Get the selected contact
        var selectedContact = $('.contact.selected');

        if (selectedContact) {
            // Extract username, profile picture source, and profile picture initial from the selected contact
            var username = selectedContact.data('username');
            var profilePicture = selectedContact.find('.profile-pic img');
            var profilePictureSrc = profilePicture.length ? profilePicture.attr('src') : '';
            var profilePicInitial = profilePicture.length ? '' : $('<span>').text(username.charAt(0).toUpperCase());

            // Update chat info
            var chatInfo = $('.chat-info');
            chatInfo.empty(); // Clear existing content
            var profilePic = $('<div>').addClass('profile-pic').append(profilePictureSrc ? $('<img>').attr('src', profilePictureSrc) : profilePicInitial); // Append profile picture or initial
            var usernameElement = $('<div>').addClass('contact-name').text(username);
            chatInfo.append(profilePic).append(usernameElement);
        }

    }
}
setInterval(updateChatInfo, 1000);


// Function to update contacts based on messages
function updateContacts() {
    $.ajax({
        type: "GET",
        url: "/fetch_contacts/",
        cache: false,
        success: function(data) {

            // Clear the existing contacts list
            $(".contacts").empty();

            // Check if there are no contacts
            if (data.contacts.length === 0) {
                $(".contacts").append("<div class='no-contacts'>No contacts</div>");
                return; // Exit the function if there are no contacts
            }

            // Sort contacts based on the last_message timestamp
            data.contacts.sort(function(a, b) {
                return new Date(b.last_message) - new Date(a.last_message);
            });

            // Clear the existing contacts list
            $(".contacts").empty();
            // Append the fetched contacts to the list
            $.each(data.contacts, function(index, contact) {
                var profilePic = $("<span>")
                    .addClass("profile-pic")
                    .text(contact.username.charAt(0).toUpperCase());

                // Check if profile picture data exists for the contact
                if (contact.profile_picture) {
                    profilePic.empty();
                    profilePic.append($("<img>").attr("src", "data:image/png;base64," + contact.profile_picture).attr("alt", contact.username));
                }

                var contactName = $("<span>")
                    .addClass("contact-name")
                    .text(contact.username);

                // Create a container for the contact name and last message
                var nameLastMessageContainer = $("<div>").addClass("name-last-message-container")
                    .append(contactName);

                // Display the last message if there are no unread messages
                if (contact.last_message) {
                    var lastMessage = $("<div>")
                        .addClass("last-message")
                        .text(contact.last_message)
                    nameLastMessageContainer.append(lastMessage);
                }

                // Create a container for the new message indicator (dot)
                var newMessageIndicatorContainer = $("<div>").addClass("new-message-indicator-container");

                // Check if there are unread messages
                if (contact.has_unread_messages && contact.id !== currentContactID) {
                    // Add a "New Message" indicator if there are unread messages
                    var newMessageIndicator = $("<span>")
                        .addClass("new-message-indicator")
                        .text(".");
                    newMessageIndicatorContainer.append(newMessageIndicator);
                    // Set the color of both last message and new message indicator
                    nameLastMessageContainer.find('.last-message').css('color', 'var(--light-purple)');
                }

                // Create a container for the profile picture and contact details
                var contactDetails = $("<div>").addClass("contact-details")
                    .append(profilePic)
                    .append(nameLastMessageContainer)
                    .append(newMessageIndicatorContainer);

                var contactElement = $("<div>")
                    .addClass("contact")
                    .attr("data-username", contact.username)
                    .attr("data-id", contact.id)
                    .append(contactDetails);

                // Add the 'selected' class to the currently selected contact
                if (contact.id === currentContactID) {
                    contactElement.addClass('selected');
                }

                $(".contacts").append(contactElement);

                // Check if the chat is currently open and mark messages as read
                if (contact.id === currentContactID) {
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

    // Fetch and update contacts every second
    updateContacts();

    if (currentContactID) {
        (async function() {
            try {
                var currentContactUsername = await fetchUserName(currentContactID);
                loadAndDisplayMessages(currentContactUsername, messagesLimit, messagesOffset);
            } catch (error) {
                console.error(error);
                $(".chat").empty().html("<div class='select-chat'>No chat selected</div>");
            }
        })();
    } else {
        $(".chat").empty().html("<div class='select-chat'>No chat selected</div>");
    }
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
function markMessagesAsRead(currentContactUsername) {
    $.ajax({
        url: `/mark_messages_as_read/${currentContactUsername}/`,
        method: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        },
    });
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
    e.preventDefault();

    // Get the message input value and trim whitespace
    var messageInput = $('.message').val().trim();

    // Check if the message is not empty
    if (messageInput !== '') {

        // Get the form data
        var formData = $(this).serialize();

        $.ajax({
            type: "POST",
            url: "/send_message/",
            data: formData,
            dataType: 'json',
            success: function(response) {
                // Handle the response (e.g., display success or error messages)
                if (response.success) {
                    // Append the new message to the chat container
                    appendNewMessage(response.message);
                    $('.message').val('');
                } else {
                    console.error('Error: ' + response.error);
                }
            },
            error: function(xhr, status, error) {
                console.error('An error occurred while sending the message:', error);
            }
        });
    }
});

// Trigger the search when input changes
$('.search-form').on('input', function() {


    if ($(this).find('.search-query').val().trim() === '') {
        // Show contacts and hide search results
        $(".contacts").show();
        $(".search-results").hide();
    } else {
        // Hide contacts and show search results
        $(".contacts").hide();
        $(".search-results").show();
        $(this).submit();
    }
});

// Handle form submission
$('.search-form').submit(function(e) {
    e.preventDefault();

    var formData = $(this).serialize();
    $.ajax({
        type: "POST",
        url: "/search_users/",
        data: formData,
        dataType: 'json',
        success: function(response) {
            if (response.users.length > 0) {
                $(".search-results").empty();

                // Iterate over the search results and append them to the search-results list
                response.users.forEach(function(user) {

                    var profilePic = $("<span>")
                        .addClass("profile-pic")
                        .text(user.username.charAt(0).toUpperCase());

                    // Check if profile picture data exists for the contact
                    if (user.profile_picture) {
                        profilePic.empty();
                        profilePic.append($("<img>").attr("src", "data:image/png;base64," + user.profile_picture).attr("alt", user.username));
                    }

                    var username = $("<div>")
                        .addClass("contact-name")
                        .text(user.username);

                    var searchResult = $("<div>")
                        .addClass("search-result contact")
                        .attr("data-username", user.username)
                        .attr("data-id", user.id)
                        .append(profilePic)
                        .append(username);

                    $(".search-results").append(searchResult);
                });
            } else {
                // If no users found, display a message
                $(".search-results").html("<div class='no-search-results'>No results found</div>");
            }
        },

        error: function(xhr, status, error) {
            console.error('An error occurred while searching for a user:', error);
        }
    });
});

// Add a click event listener to search result contacts
$('body').on('click', '.search-result.contact', function(event) {
    event.preventDefault();

    // Hide the search form and results
    $(".search-results").hide();
    $(".contacts").show();
    $('.search-query').val('')


});