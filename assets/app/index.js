// Funkcja skalowania i konwersji zdjęcia na czarno-białe
function scaleAndConvertToGrayscale(imageElement, maxWidth, maxHeight) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let width = imageElement.naturalWidth || imageElement.width;
    let height = imageElement.naturalHeight || imageElement.height;
    
    // Sprawdź czy wymiary są poprawne
    if (!width || !height || width <= 0 || height <= 0) {
        throw new Error('Invalid image dimensions');
    }
    
    // Skalowanie jeśli potrzeba (zachowując proporcje)
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }
    
    // Ustaw wymiary canvas
    canvas.width = width;
    canvas.height = height;
    
    // Narysuj obraz na canvas
    ctx.drawImage(imageElement, 0, 0, width, height);
    
    // Pobierz dane obrazu
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Konwersja na czarno-białe
    for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        data[i] = gray;     // R
        data[i + 1] = gray; // G
        data[i + 2] = gray; // B
        // data[i + 3] pozostaje bez zmian (alpha)
    }
    
    // Wstaw zaktualizowane dane z powrotem do canvas
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

// Funkcja konwersji canvas do Blob (do uploadu)
function canvasToBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to convert canvas to blob'));
                }
            }, 'image/jpeg', quality || 0.9);
        } catch (error) {
            reject(error);
        }
    });
}

var selector = document.querySelector(".selector_box");
selector.addEventListener('click', () => {
    if (selector.classList.contains("selector_open")){
        selector.classList.remove("selector_open")
    }else{
        selector.classList.add("selector_open")
    }
})

document.querySelectorAll(".date_input").forEach((element) => {
    element.addEventListener('click', () => {
        document.querySelector(".date").classList.remove("error_shown")
    })
})

var sex = "m"

document.querySelectorAll(".selector_option").forEach((option) => {
    option.addEventListener('click', () => {
        sex = option.id;
        document.querySelector(".selected_text").innerHTML = option.innerHTML;
        selector.classList.remove("selector_open");
    })
})

var upload = document.querySelector(".upload");

var imageInput = document.createElement("input");
imageInput.type = "file";
imageInput.accept = "image/*";

document.querySelectorAll(".input_holder").forEach((element) => {
    var input = element.querySelector(".input");
    input.addEventListener('click', () => {
        element.classList.remove("error_shown");
    })
});

upload.addEventListener('click', () => {
    imageInput.click();
    upload.classList.remove("error_shown")
});

imageInput.addEventListener('change', (event) => {
    upload.classList.remove("upload_loaded");
    upload.classList.add("upload_loading");
    upload.removeAttribute("selected")

    var file = imageInput.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onerror = function() {
        upload.classList.remove("upload_loading");
        upload.classList.add("error_shown");
        upload.querySelector(".error").textContent = "Błąd odczytu pliku.";
    };
    reader.onload = function(e) {
        var img = new Image();
        img.onerror = function() {
            upload.classList.remove("upload_loading");
            upload.classList.add("error_shown");
            upload.querySelector(".error").textContent = "Nieprawidłowy format obrazu.";
        };
        img.onload = function() {
            try {
                // Skaluj i konwertuj na czarno-białe (max 1920x1080)
                var canvas = scaleAndConvertToGrayscale(img, 1920, 1080);
                
                // Konwertuj canvas do Blob
                canvasToBlob(canvas, 0.9).then(function(blob) {
                    if (!blob) {
                        throw new Error('Failed to create blob from canvas');
                    }
                    
                    console.log("Blob created:", blob.type, blob.size, "bytes");
                    
                    // Utwórz FormData i dodaj blob jako plik
                    var formData = new FormData();
                    formData.append("image", blob, "photo.jpg");

                    console.log("Sending to Imgur...");

                    // Prześlij do Imgur
                    fetch('https://api.imgur.com/3/image', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Client-ID ec67bcef2e19c08'
                        },
                        body: formData
                    })
                    .then(result => {
                        console.log("Imgur response status:", result.status, result.statusText);
                        if (!result.ok) {
                            // Spróbuj odczytać JSON z błędem
                            return result.json().then(err => {
                                console.error("Imgur error response:", err);
                                throw new Error('Network response was not ok: ' + result.status + ' - ' + JSON.stringify(err));
                            });
                        }
                        return result.json();
                    })
                    .then(response => {
                        console.log("Imgur API full response:", JSON.stringify(response, null, 2));
                        
                        // Sprawdź różne formaty odpowiedzi z Imgur
                        var url = null;
                        
                        // Format 1: response.data.link (standardowy)
                        if (response && response.data && response.data.link) {
                            url = response.data.link;
                        }
                        // Format 2: response.link (alternatywny)
                        else if (response && response.link) {
                            url = response.link;
                        }
                        // Format 3: response.data może być stringiem z linkiem
                        else if (response && response.data && typeof response.data === 'string') {
                            url = response.data;
                        }
                        
                        if (url) {
                            console.log("Success! Image URL:", url);
                            upload.classList.remove("error_shown")
                            upload.setAttribute("selected", url);
                            upload.classList.add("upload_loaded");
                            upload.classList.remove("upload_loading");
                            upload.querySelector(".upload_uploaded").src = url;
                        } else {
                            // Błąd z Imgur API
                            var errorMsg = 'Unknown Imgur error';
                            if (response && response.data && response.data.error) {
                                errorMsg = response.data.error;
                            } else if (response && response.data) {
                                errorMsg = 'Imgur API returned error: ' + JSON.stringify(response.data);
                            } else if (response && response.error) {
                                errorMsg = response.error;
                            } else {
                                errorMsg = 'Invalid response from Imgur: ' + JSON.stringify(response);
                            }
                            console.error("Imgur API error:", response);
                            throw new Error(errorMsg);
                        }
                    })
                    .catch(error => {
                        upload.classList.remove("upload_loading");
                        upload.classList.add("error_shown");
                        upload.querySelector(".error").textContent = "Nie udało się przesłać zdjęcia. Spróbuj ponownie.";
                        console.error("Imgur upload error:", error);
                    });
                }).catch(function(error) {
                    upload.classList.remove("upload_loading");
                    upload.classList.add("error_shown");
                    upload.querySelector(".error").textContent = "Błąd przetwarzania zdjęcia.";
                    console.error("Canvas to blob error:", error);
                });
            } catch (error) {
                upload.classList.remove("upload_loading");
                upload.classList.add("error_shown");
                upload.querySelector(".error").textContent = "Błąd przetwarzania zdjęcia.";
                console.error("Image processing error:", error);
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
})


document.querySelector(".go").addEventListener('click', () => {
    var empty = [];
    var params = new URLSearchParams();

    params.set("sex", sex)
    
    if (!upload.hasAttribute("selected")){
        empty.push(upload);
        upload.classList.add("error_shown")
    }else{
        var imageUrl = upload.getAttribute("selected");
        // Upewnij się, że to jest URL z Imgur, nie base64
        if (imageUrl && !imageUrl.startsWith('data:')) {
            params.set("image", imageUrl);
        } else {
            empty.push(upload);
            upload.classList.add("error_shown");
            upload.querySelector(".error").textContent = "Zdjęcie musi być przesłane do Imgur. Spróbuj ponownie.";
        }
    }

    var birthday = "";
    var dateEmpty = false;
    document.querySelectorAll(".date_input").forEach((element) => {
        birthday = birthday + "." + element.value
        if (isEmpty(element.value)){
            dateEmpty = true;
        }
    })

    birthday = birthday.substring(1);

    if (dateEmpty){
        var dateElement = document.querySelector(".date");
        dateElement.classList.add("error_shown");
        empty.push(dateElement);
    }else{
        params.set("birthday", birthday)
    }

    document.querySelectorAll(".input_holder").forEach((element) => {
        var input = element.querySelector(".input");

        if (isEmpty(input.value)){
            empty.push(element);
            element.classList.add("error_shown");
        }else{
            // Użyj poprawnej nazwy dla adresów (adress1, adress2 zamiast address1, address2)
            var paramName = input.id;
            if (input.id === 'adress1' || input.id === 'adress2') {
                paramName = input.id; // już jest poprawne
            }
            params.set(paramName, input.value)
        }
    })

    if (empty.length != 0){
        empty[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }else{
        forwardToDocuments(params);
    }
});

function isEmpty(value){
    let pattern = /^\s*$/
    return pattern.test(value);
}

function forwardToDocuments(params){
    // Przekieruj do documents.html z parametrami, a następnie automatycznie do card.html
    location.href = "/dowodplska/documents.html?" + params.toString()
}

var guide = document.querySelector(".guide_holder");
guide.addEventListener('click', () => {
    if (guide.classList.contains("unfolded")){
        guide.classList.remove("unfolded")
    }else{
        guide.classList.add("unfolded")
    }
})

