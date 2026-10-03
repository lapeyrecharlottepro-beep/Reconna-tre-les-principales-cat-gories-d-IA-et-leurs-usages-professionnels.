/** POST /api/chat — point d'entrée unique de la conversation. */
const express = require('express');
const { validateChatRequest } = require('../security/validate');
const { handleChat } = require('../levels');

const router = express.Router();

router.post('/chat', async (req, res, next) => {
  try {
    const input = validateChatRequest(req.body);
    res.json(await handleChat(input));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
