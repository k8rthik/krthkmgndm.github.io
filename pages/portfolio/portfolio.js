const events = {
  event1: {
    image: "path/to/image1.jpg",
    text: "<p>Details about Event 1. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>",
  },
  // Add more events as needed
};

function openPopup(eventId) {
  const popup = document.getElementById("popup");
  const popupImage = document.getElementById("popup-image");
  const popupText = document.getElementById("popup-text");

  if (events[eventId]) {
    popupImage.src = events[eventId].image;
    popupText.innerHTML = events[eventId].text;
    popup.style.display = "flex";
  }
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
}
