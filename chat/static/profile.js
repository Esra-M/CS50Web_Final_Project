var profilePictureToDelete = false;

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
// Function to open the profile modal dialog
function openProfileModal(username) {
    var modal = document.getElementById('profileModal');
    var profileUsername = document.getElementById('profileUsername');
    var userProfilePic = document.getElementById('userProfilePic');
    var profilePic = document.getElementById('profilePic');

    profileUsername.innerText = username;

    // Check if userProfilePic contains an image
    if (userProfilePic.querySelector('img')) {
        // If userProfilePic contains an image, display its content in profilePic
        profilePic.innerHTML = userProfilePic.innerHTML;
    } else if (userProfilePic.textContent.trim() !== '') {
        // If userProfilePic is not empty and doesn't contain an image, display its content in profilePic
        profilePic.innerText = userProfilePic.textContent.trim();
    } else {
        // If userProfilePic is empty, display the first letter of the username in profilePic
        profilePic.innerText = username.charAt(0).toUpperCase();
    }

    // Display the modal
    modal.style.display = 'block';
}


// Function to close the profile modal dialog
function closeProfileModal() {
    var modal = document.getElementById('profileModal');
    modal.style.display = 'none';
    document.getElementById('editMenu').style.display = 'none';
    document.getElementById('profileMessage').textContent = '';
    document.getElementById('profilePictureInput').value = '';
    document.getElementById('newUsernameInput').value = '';
    document.getElementById('editProfileButton').style.display = 'inline-block';
    document.getElementById('profileUsername').style.display = 'block';
    $('label[for="profilePictureInput"]').hide();

    var removeProfilePicButton = document.getElementById('removeProfilePicButton');
    removeProfilePicButton.style.display = 'none';

    var logoutBtnOut = document.getElementById('logoutBtnOut');
    logoutBtnOut.style.display = 'inline-block';

    profilePictureToDelete = false;

}

function toggleEditMenu() {
    var editMenu = document.getElementById('editMenu');
    var editButton = document.getElementById('editProfileButton');
    var newUsernameInput = document.getElementById('newUsernameInput');
    var profileUsername = document.getElementById('profileUsername');

    editMenu.style.display = 'block';
    editButton.style.display = 'none';
    newUsernameInput.style.display = 'block';
    profileUsername.style.display = 'none';
    $('label[for="profilePictureInput"]').show();

    var logoutBtnIn = document.getElementById('logoutBtnIn');
    var logoutBtnOut = document.getElementById('logoutBtnOut');
    logoutBtnIn.style.display = 'inline-block';
    logoutBtnOut.style.display = 'none';

    var removeProfilePicButton = document.getElementById('removeProfilePicButton');
    // Check if userProfilePic contains an image
    if (userProfilePic.querySelector('img')) {
        // If userProfilePic contains an image, show the remove profile picture button
        removeProfilePicButton.style.display = 'block';
    } else {
        // If userProfilePic does not contain an image, hide the remove profile picture button
        removeProfilePicButton.style.display = 'none';
    }
    // Set the value of the input field to the current username
    newUsernameInput.value = profileUsername.textContent.trim();
    document.getElementById('newUsernameInput').focus()

}
// Function to update the profile
$('#editMenu').submit(function(event) {
    event.preventDefault();


    var newUsername = document.getElementById('newUsernameInput').value;
    var oldUsername = document.getElementById('profile-username').textContent;
    var profilePictureInput = document.getElementById('profilePictureInput').files[0];

    // Check if the delete profile picture button was pressed
    if (profilePictureToDelete) {
        // If yes, set profilePictureInput to null to indicate no new profile picture is selected
        profilePictureInput = null;
    }

    // Prepare form data for AJAX request
    var formData = new FormData();
    formData.append('new_username', newUsername);
    formData.append('profile_picture', profilePictureInput);

    if (profilePictureToDelete) {
        var profileUsername = document.getElementById('profileUsername').textContent.trim();

        // Send an AJAX request to remove the profile picture
        $.ajax({
            type: "POST",
            url: "/remove_profile_picture/",
            data: { username: profileUsername },
            headers: {
                'X-CSRFToken': csrftoken
            },
            success: function(response) {
                // Update the profile picture elements
                // Remove the profile picture from the profilePic and userProfilePic
                $('#profilePic').text($('#profileUsername').text().charAt(0).toUpperCase());
                $('#userProfilePic').text($('#profileUsername').text().charAt(0).toUpperCase());

            },
            error: function(xhr, status, error) {
                // Handle error response (e.g., display error message)
                console.error('An error occurred while removing the profile picture:', error);
            }
        });


    }

    // Send AJAX request to update profile
    $.ajax({
        type: "POST",
        url: "/update_profile/",
        data: formData,
        headers: {
            'X-CSRFToken': csrftoken
        },
        processData: false,
        contentType: false,
        success: function(response) {
            // Update profile picture elements
            if (response.profile_picture) {
                var img = new Image();
                img.src = 'data:image/jpeg;base64,' + response.profile_picture;

                var userProfilePic = document.getElementById('userProfilePic');
                var profilePic = document.getElementById('profilePic');

                // Clear the contents of the elements
                userProfilePic.innerHTML = '';
                profilePic.innerHTML = '';

                // Append the image to each element
                userProfilePic.appendChild(img.cloneNode(true));
                profilePic.appendChild(img);

            }

            var profileMessageElement = document.getElementById('profileMessage');
            profileMessageElement.textContent = response.message;
            profileMessageElement.style.display = 'block';

            // Update the username element if the username has been changed
            if (response.success && response.username) {
                var newUsername = response.username;

                // Update the profile-username elements
                var profileUsername = document.getElementById('profileUsername');
                profileUsername.textContent = newUsername;
                profileUsername.setAttribute('onclick', "openProfileModal('" + newUsername + "')");

                var profile = document.getElementsByClassName('profile');
                for (var i = 0; i < profile.length; i++) {
                    profile[i].setAttribute('onclick', "openProfileModal('" + newUsername + "')");
                }

                var profileUsernames = document.getElementsByClassName('profile-username');
                for (var i = 0; i < profileUsernames.length; i++) {
                    profileUsernames[i].textContent = newUsername;
                }
                if (!response.profile_picture) {
                    // Update the profile-pic to display the first letter of the new username
                    var firstLetter = newUsername.charAt(0).toUpperCase();
                    document.getElementById('profilePic').textContent = firstLetter;
                    document.getElementById('userProfilePic').textContent = firstLetter;
                }

            }

            if (!response.message) {


                // Clear the input fields
                document.getElementById('profilePictureInput').value = '';
                document.getElementById('newUsernameInput').value = '';
                document.getElementById('profileMessage').value = '';
                // Hide the "x" button
                var removeProfilePicButton = document.getElementById('removeProfilePicButton');
                removeProfilePicButton.style.display = 'none';

                // Hide the edit menu after successfully saving changes
                document.getElementById('editMenu').style.display = 'none';
                document.getElementById('editProfileButton').style.display = 'inline-block';
                document.getElementById('profileUsername').style.display = 'block';
                $('label[for="profilePictureInput"]').hide();
                var logoutBtnOut = document.getElementById('logoutBtnOut');
                logoutBtnOut.style.display = 'inline-block';
            }
        },
        error: function(xhr, status, error) {
            // Handle error response (e.g., display error message)
            console.error('An error occurred while updating the profile:', error);
        }
    });
});


// Function to handle the click event of the "x" button to remove profile picture preview
document.getElementById('removeProfilePicButton').addEventListener('click', function() {

    // Remove the profile picture preview from the profilePic and userProfilePic
    $('#profilePic').text($('#profileUsername').text().charAt(0).toUpperCase());

    // Set the flag to indicate that the profile picture should be deleted
    profilePictureToDelete = true;

    this.style.display = 'none';

});

// Function to handle file input change event
document.getElementById('profilePictureInput').addEventListener('change', function(event) {
    var file = event.target.files[0]; // Get the selected file
    var profilePic = document.getElementById('profilePic');
    var removeProfilePicButton = document.getElementById('removeProfilePicButton');

    // Check if a file is selected
    if (file) {
        var reader = new FileReader();

        // Closure to capture the file information.
        reader.onload = (function(theFile) {
            return function(e) {
                // Render thumbnail.
                var img = new Image();
                img.src = e.target.result;
                profilePic.innerHTML = '';
                profilePic.appendChild(img);
                profilePictureToDelete = false;
                removeProfilePicButton.style.display = 'block';
            };
        })(file);

        // Read in the image file as a data URL.
        reader.readAsDataURL(file);
    }
});