'use strict';

const { Markup } = require('telegraf');

// Bot
const { replyOptions } = require('../../bot/options');

// DB
const {
	getCommand,
	removeCommand,
	updateCommand
} = require('../../stores/command');

const preserved = [ 'admin', 'unadmin', 'leave', 'warn', 'unwarn', 'nowarns',
	'getwarns', 'ban', 'unban', 'report', 'staff', 'link', 'groups', 'commands',
	'addcommand', 'removecommand' ];

const addCustomCmdHandler = async ({ chat, message, reply, state }, next) => {
	const { text, photo, document, video, audio } = message;
	const { isAdmin, user } = state;
	const { id } = user;

	if (text && /^\/\w+/.test(text)) {
		await removeCommand({ id, isActive: false });
		return next();
	}

	const command = await getCommand({ id, isActive: false });
	if (chat.type !== 'private' ||
		!isAdmin ||
		!command ||
		!command.state) {
		return next();
	}

	if (command.state === 'add') {
		if (!/^(?=\D)\w+$/.test(text)) {
			reply('Please send a valid command.');
			return next();
		}
		if (preserved.includes(text.toLowerCase())) {
			reply('❗️Sorry you can\'t use this name, it\'s preserved.\n\n' +
			'Try another one.');
			return next();
		}

		if (await getCommand({ isActive: true, name: text })) {
			reply(
				'ℹ️ <b>This command already exists.</b>\n\n' +
				'/commands - to see the list of commands.\n' +
				'/addcommand - to add a command.\n' +
				'/removecommand <code>&lt;name&gt;</code>' +
				' - to remove a command.',
				replyOptions
			);
			return next();
		}
		await updateCommand({ id, name: text, state: 'role' });
		reply('Who can use this command?', Markup.keyboard([
			[ 'Master', 'Admins', 'Everyone' ]
		])
			.oneTime()
			.resize()
			.extra());
		return next();
	}

	if (command.state === 'role') {
		const role = text.toLowerCase();
		if (role !== 'master' && role !== 'admins' && role !== 'everyone') {
			reply('Please send a valid role.', Markup.keyboard([
				[ 'Master', 'Admins', 'Everyone' ]
			])
				.oneTime()
				.resize()
				.extra());
			return next();
		}
		await updateCommand({ id, role, state: 'content' });
		reply(
			'Send the content you wish to be shown when the command is used.' +
			'.\n\nSupported contents:\n- <b>Text (HTML)</b>\n- <b>Photo</b>' +
			'\n- <b>Video</b>\n- <b>Document</b>\n- <b>Audio</b>',
			replyOptions
		);
		return next();
	}

	if (command.state === 'content') {
		let newCommand;
		if (text) {
			newCommand = { content: text, type: 'text' };
		}
		if (photo) {
			newCommand = {
				content: photo[photo.length - 1].file_id,
				type: 'photo'
			};
		}
		if (document) {
			newCommand = { content: document.file_id, type: 'document' };
		}
		if (video) {
			newCommand = { content: video.file_id, type: 'video' };
		}
		if (audio) {
			newCommand = { content: audio.file_id, type: 'audio' };
		}
		if (message.caption) {
			newCommand.caption = message.caption;
		}
		await Promise.all([
			updateCommand(Object.assign(
				{},
				newCommand,
				{ id, isActive: true, state: null }
			)),
		]);
		reply(
			'✅ <b>New command has been created successfully.</b>\n\n' +
			'Custom commands work with ! instead of /.\n\n' +
			'For example: <code>!rules</code>\n\n' +
			'Custom commands can reply other messages too.\n\n' +
			'/commands - to see the list of commands.\n' +
			'/addcommand - to add a new command.\n' +
			'/removecomand <code>&lt;name&gt;</code> - to remove a command.',
			replyOptions
		);
		return next();
	}
	return next();
};

module.exports = addCustomCmdHandler;
