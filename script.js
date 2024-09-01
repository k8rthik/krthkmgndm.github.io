document.addEventListener("DOMContentLoaded", () => {
  const firstName = document.querySelector(".first-name");
  const lastName = document.querySelector(".last-name");
  const originalFirstName = firstName.textContent;
  const originalLastName = lastName.textContent;

  const scrambleText = (text) => {
    return text
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  };

  firstName.textContent = scrambleText(originalFirstName);
  lastName.textContent = scrambleText(originalLastName);

  const unscramble = (element, originalText) => {
    let unscrambledText = "";
    let delay = 0;

    originalText.split("").forEach((char, index) => {
      setTimeout(() => {
        unscrambledText += char;
        const scrambled =
          unscrambledText + scrambleText(originalText.slice(index + 1));
        element.textContent = scrambled;
      }, delay);

      delay += 100;
    });
  };

  unscramble(firstName, originalFirstName);
  unscramble(lastName, originalLastName);
});
