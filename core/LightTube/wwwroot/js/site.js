const subscribeButtons = document.querySelectorAll("button.subscribe-button");
const subscribeToChannel = (e) => {
    const channelId = e.target.attributes["data-cid"].value;
    e.target.disabled = true;

    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/Account/Subscribe?channel=" + channelId, false)
    xhr.send()

    e.target.disabled = false;
    if (xhr.status !== 200)
        alert("You need to login to subscribe to a channel")

    if (xhr.responseText === "true") {
        e.target.innerText = "Subscribed";
        e.target.classList.add("subscribed")
    } else {
        e.target.innerText = "Subscribe";
        e.target.classList.remove("subscribed")
    }
}

if (subscribeButtons.length > 0) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/Account/SubscriptionsJson", false)
    xhr.send()

    let subscribedChannels = JSON.parse(xhr.responseText);

    for (let i = 0; i < subscribeButtons.length; i++) {
        let button = subscribeButtons[i];
        if (subscribedChannels.includes(button.attributes["data-cid"].value)) {
            button.innerText = "Subscribed";
            button.classList.add("subscribed")
        } else {
            button.innerText = "Subscribe";
            button.classList.remove("subscribed")
        }

        button.onclick = subscribeToChannel;
        button.style.display = ""
    }
}