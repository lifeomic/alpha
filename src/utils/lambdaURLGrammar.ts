// Generated automatically by nearley, version 2.16.0
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }

const flattenDeep = require('lodash/flattenDeep');
const get = require('lodash/get');

export interface Token { value: any; [key: string]: any };

export interface Lexer {
  reset: (chunk: string, info: any) => void;
  next: () => Token | undefined;
  save: () => any;
  formatError: (token: Token) => string;
  has: (tokenType: string) => boolean
};

export interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any
};

export type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

export var Lexer: Lexer | undefined = undefined;

export var ParserRules: NearleyRule[] = [
    {"name": "lambdaURL$string$1", "symbols": [{"literal":"l"}, {"literal":"a"}, {"literal":"m"}, {"literal":"b"}, {"literal":"d"}, {"literal":"a"}, {"literal":":"}, {"literal":"/"}, {"literal":"/"}], "postprocess": (d) => d.join('')},
    {"name": "lambdaURL$ebnf$1$subexpression$1", "symbols": [{"literal":":"}, "qualifier"]},
    {"name": "lambdaURL$ebnf$1", "symbols": ["lambdaURL$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "lambdaURL$ebnf$1", "symbols": [], "postprocess": () => null},
    {"name": "lambdaURL$ebnf$2", "symbols": ["path"], "postprocess": id},
    {"name": "lambdaURL$ebnf$2", "symbols": [], "postprocess": () => null},
    {"name": "lambdaURL", "symbols": ["lambdaURL$string$1", "anyName", "lambdaURL$ebnf$1", "lambdaURL$ebnf$2"], "postprocess": 
        (data) => ({
            name: flattenDeep(data[1]).join(''),
            qualifier: flattenDeep(get(data, '[2][1]',  [])).join(''),
            path: flattenDeep(get(data, '[3]',  [])).join('')
        })
        },
    {"name": "anyName", "symbols": ["functionName"]},
    {"name": "anyName", "symbols": ["partialArnName"]},
    {"name": "anyName", "symbols": ["fullArnName"]},
    {"name": "path$ebnf$1", "symbols": []},
    {"name": "path$ebnf$1", "symbols": ["path$ebnf$1", /./], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "path", "symbols": [{"literal":"/"}, "path$ebnf$1"]},
    {"name": "functionName$ebnf$1", "symbols": [/[a-zA-Z0-9-_]/]},
    {"name": "functionName$ebnf$1", "symbols": ["functionName$ebnf$1", /[a-zA-Z0-9-_]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "functionName", "symbols": ["functionName$ebnf$1"]},
    {"name": "qualifier$string$1", "symbols": [{"literal":"$"}, {"literal":"L"}, {"literal":"A"}, {"literal":"T"}, {"literal":"E"}, {"literal":"S"}, {"literal":"T"}], "postprocess": (d) => d.join('')},
    {"name": "qualifier", "symbols": ["qualifier$string$1"]},
    {"name": "qualifier$ebnf$1", "symbols": [/[a-zA-Z0-9-_]/]},
    {"name": "qualifier$ebnf$1", "symbols": ["qualifier$ebnf$1", /[a-zA-Z0-9-_]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "qualifier", "symbols": ["qualifier$ebnf$1"]},
    {"name": "accountId$ebnf$1", "symbols": [/[0-9]/]},
    {"name": "accountId$ebnf$1", "symbols": ["accountId$ebnf$1", /[0-9]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "accountId", "symbols": ["accountId$ebnf$1"]},
    {"name": "region$ebnf$1", "symbols": [/[a-zA-Z0-9-_]/]},
    {"name": "region$ebnf$1", "symbols": ["region$ebnf$1", /[a-zA-Z0-9-_]/], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "region", "symbols": ["region$ebnf$1"]},
    {"name": "partialArnName$string$1", "symbols": [{"literal":":"}, {"literal":"f"}, {"literal":"u"}, {"literal":"n"}, {"literal":"c"}, {"literal":"t"}, {"literal":"i"}, {"literal":"o"}, {"literal":"n"}, {"literal":":"}], "postprocess": (d) => d.join('')},
    {"name": "partialArnName", "symbols": ["accountId", "partialArnName$string$1", "functionName"]},
    {"name": "fullArnName$string$1", "symbols": [{"literal":"a"}, {"literal":"r"}, {"literal":"n"}, {"literal":":"}, {"literal":"a"}, {"literal":"w"}, {"literal":"s"}, {"literal":":"}, {"literal":"l"}, {"literal":"a"}, {"literal":"m"}, {"literal":"b"}, {"literal":"d"}, {"literal":"a"}, {"literal":":"}], "postprocess": (d) => d.join('')},
    {"name": "fullArnName", "symbols": ["fullArnName$string$1", "region", {"literal":":"}, "partialArnName"]}
];

export var ParserStart: string = "lambdaURL";
