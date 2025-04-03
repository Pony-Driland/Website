// Check if CTRL + ALT + A was pressed
$(document).on('keydown', function (event) {
  if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'a') {
    event.preventDefault(); // Prevent any default behavior
    $('body').toggleClass('detect-made-by-ai');
  }
});

/*
document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault(); // Prevent any default behavior
        document.body.classList.toggle('detect-made-by-ai');
    }
});
*/

/*
import { useEffect } from "react";

function KeyPressHandler() {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "a") {
                event.preventDefault();
                document.body.classList.toggle("detect-made-by-ai");
            }
        };
        
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return null;
}

export default KeyPressHandler;
*/
