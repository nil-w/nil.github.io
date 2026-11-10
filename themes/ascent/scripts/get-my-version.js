"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyVersion = void 0;
const assert_1 = __importDefault(require("assert"));
const getMyVersion = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require(__dirname + '/../../../package.json');
    (0, assert_1.default)(typeof version === 'string');
    return version;
};
exports.getMyVersion = getMyVersion;
