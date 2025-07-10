const { createRoomMessage, createChatMessage } = require('../messageUtils');

const pendingImageMentions = {}; // { senderUsername: { mentionedUser, timeoutId } }

function clearPendingMention(sender) {
    if (pendingImageMentions[sender]) {
        clearTimeout(pendingImageMentions[sender].timeoutId);
        delete pendingImageMentions[sender];
    }
}

function handleMentionMessage(data, socket, ioSockets) {
    const sender = data.from;
    const room = data.room;
    const message = data.body.trim();

    if (!message.startsWith('@')) return;

    const parts = message.split(' ');
    const mentionedUser = parts[0].substring(1);
    const content = parts.slice(1).join(' ').trim();

    if (!content) {
        // Pending image or text request
        if (pendingImageMentions[sender]) clearPendingMention(sender);

        const timeoutId = setTimeout(() => {
            delete pendingImageMentions[sender];
            socket.send(JSON.stringify(createRoomMessage(room,
                `⌛ Time to send image or text to @${mentionedUser} has expired. Please resend the mention if you want to try again.`)));
        }, 30000);

        pendingImageMentions[sender] = { mentionedUser, timeoutId };

        socket.send(JSON.stringify(createRoomMessage(room,
            `ℹ️ You can now send an image or text to @${mentionedUser} and it will be forwarded privately within 30 seconds.`)));
        return;
    }

    clearPendingMention(sender);

    const isImageUrl = /\.(jpg|jpeg|png|gif|webp)$/i.test(content);
    if (isImageUrl) {
        // Send image and explanatory text privately
        const imageMsg = {
            handler: 'chat_message',
            id: "60b9cd76-c459-4c52-b782-199737cc1041",
            to: mentionedUser,
            body: '',
            type: 'image',
            url: content
        };
        socket?.send(JSON.stringify(imageMsg));

        const textMsg = createChatMessage(mentionedUser,
            `📩 You have a new image from @${sender} (private mention).`);
        socket?.send(JSON.stringify(textMsg));
    } else {
        const textMsg = createChatMessage(mentionedUser,
            `📩 Private message from @${sender}:\n${content}`);
        socket?.send(JSON.stringify(textMsg));
    }

    socket.send(JSON.stringify(createRoomMessage(room,
        `✅ Your message has been sent privately to @${mentionedUser}.`)));
}

function handleImageMessage(data, socket, ioSockets) {
    if (data.type !== 'image') return;

    const sender = data.from;
    const room = data.room;
    const imageUrl = data.url;

    if (pendingImageMentions[sender]) {
        const { mentionedUser, timeoutId } = pendingImageMentions[sender];
        clearTimeout(timeoutId);
        delete pendingImageMentions[sender];

        // Send the image privately
        const imageMsg = {
            handler: 'chat_message',
            id: Date.now().toString(),
            to: mentionedUser,
            body: '',
            type: 'image',
            url: imageUrl
        };
        socket?.send(JSON.stringify(imageMsg));

        // Send explanatory text
        const textMsg = createChatMessage(mentionedUser,
            `📩 You have a new image from @${sender} (private mention).`);
        socket?.send(JSON.stringify(textMsg));

        // Confirm in the room
        socket.send(JSON.stringify(createRoomMessage(room,
            `✅ The image has been sent privately to @${mentionedUser}.`)));
    }
}

module.exports = {
    handleMentionMessage,
    handleImageMessage
};
