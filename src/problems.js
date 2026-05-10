// src/problems.js
//
// This file holds your problem catalog.
// 
// To add MORE problems:
//   - Hand-write more entries below, OR
//   - Run scripts/import-apps.py to fetch from the APPS dataset (10,000 problems)
//     then replace this file's export with: export { default as PROBLEMS } from "../data/apps-problems.json";
//
// Each problem needs:
//   id          — unique slug
//   title       — display name (lowercase looks good with this design)
//   vibe        — "warmup" | "easy" | "medium" | "classic" (just a label)
//   difficulty  — "starter" | "easy" | "medium" (used for filtering)
//   tags        — array of topic tags
//   statement   — markdown-ish problem description
//   examples    — array of { input, output } visible to user (used for "Run")
//   tests       — array of { input, expected } including hidden tests (used for "Submit")
//   starter     — { python, cpp, java, javascript, c } starter code

export const PROBLEMS = [
  {
    id: "hello-world",
    title: "say hi to the world",
    vibe: "warmup",
    difficulty: "starter",
    tags: ["intro", "i/o"],
    statement: `your very first one. when you run any program, it talks to you through "stdout" — that's just a fancy way of saying "the screen."

your job: print exactly the words \`Hello, World!\` (caps and punctuation matter — computers are picky).

no input needed. just output.`,
    examples: [
      { input: "(none)", output: "Hello, World!" }
    ],
    tests: [
      { input: "", expected: "Hello, World!" }
    ],
    starter: {
      python: `print("Hello, World!")`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, World!";\n    return 0;\n}`,
      java: `public class Main {\n    public static void main(String[] args) {\n        System.out.print("Hello, World!");\n    }\n}`,
      javascript: `console.log("Hello, World!");`,
      c: `#include <stdio.h>\nint main() {\n    printf("Hello, World!");\n    return 0;\n}`,
    },
  },
  {
    id: "sum-two",
    title: "add two numbers",
    vibe: "warmup",
    difficulty: "starter",
    tags: ["math", "i/o"],
    statement: `read two integers separated by a space on a single line. print their sum.

input format: \`a b\` where both are integers.
output format: a single integer = a + b.`,
    examples: [
      { input: "3 5", output: "8" },
      { input: "100 -50", output: "50" },
    ],
    tests: [
      { input: "3 5",          expected: "8" },
      { input: "100 -50",      expected: "50" },
      { input: "0 0",          expected: "0" },
      { input: "-7 -8",        expected: "-15" },
    ],
    starter: {
      python: `a, b = map(int, input().split())\nprint(a + b)`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b;\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt(), b = sc.nextInt();\n        System.out.print(a + b);\n    }\n}`,
      javascript: `const [a, b] = require('fs').readFileSync(0, 'utf8').trim().split(' ').map(Number);\nconsole.log(a + b);`,
      c: `#include <stdio.h>\nint main() {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d", a + b);\n    return 0;\n}`,
    },
  },
  {
    id: "even-odd",
    title: "even or odd",
    vibe: "easy",
    difficulty: "easy",
    tags: ["conditions", "math"],
    statement: `read one integer. if it's even, print \`even\`. if it's odd, print \`odd\`. lowercase.

(remember: 0 is even.)`,
    examples: [
      { input: "4", output: "even" },
      { input: "7", output: "odd" },
      { input: "0", output: "even" },
    ],
    tests: [
      { input: "4",         expected: "even" },
      { input: "7",         expected: "odd" },
      { input: "0",         expected: "even" },
      { input: "-3",        expected: "odd" },
      { input: "1000000",   expected: "even" },
    ],
    starter: {
      python: `n = int(input())\nprint("even" if n % 2 == 0 else "odd")`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    cout << (n % 2 == 0 ? "even" : "odd");\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.print(n % 2 == 0 ? "even" : "odd");\n    }\n}`,
      javascript: `const n = parseInt(require('fs').readFileSync(0, 'utf8').trim());\nconsole.log(n % 2 === 0 ? "even" : "odd");`,
      c: `#include <stdio.h>\nint main() {\n    int n;\n    scanf("%d", &n);\n    printf("%s", n % 2 == 0 ? "even" : "odd");\n    return 0;\n}`,
    },
  },
  {
    id: "reverse-string",
    title: "flip a string",
    vibe: "easy",
    difficulty: "easy",
    tags: ["strings"],
    statement: `read a single line of text. print it reversed.

example: \`hello\` → \`olleh\``,
    examples: [
      { input: "hello", output: "olleh" },
      { input: "abc",   output: "cba" },
      { input: "racecar", output: "racecar" },
    ],
    tests: [
      { input: "hello",         expected: "olleh" },
      { input: "abc",           expected: "cba" },
      { input: "racecar",       expected: "racecar" },
      { input: "a",             expected: "a" },
      { input: "12345",         expected: "54321" },
    ],
    starter: {
      python: `s = input()\nprint(s[::-1])`,
      cpp: `#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string s; getline(cin, s);\n    reverse(s.begin(), s.end());\n    cout << s;\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine();\n        System.out.print(new StringBuilder(s).reverse());\n    }\n}`,
      javascript: `const s = require('fs').readFileSync(0, 'utf8').trim();\nconsole.log(s.split('').reverse().join(''));`,
      c: `#include <stdio.h>\n#include <string.h>\nint main() {\n    char s[1005];\n    fgets(s, 1005, stdin);\n    int n = strlen(s);\n    if (s[n-1]=='\\n') s[--n]=0;\n    for (int i = n - 1; i >= 0; i--) putchar(s[i]);\n    return 0;\n}`,
    },
  },
  {
    id: "fizzbuzz",
    title: "fizzbuzz",
    vibe: "classic",
    difficulty: "easy",
    tags: ["loops", "conditions"],
    statement: `read an integer n. for each i from 1 to n (inclusive), print on its own line:
- \`FizzBuzz\` if i is divisible by both 3 and 5
- \`Fizz\` if only divisible by 3
- \`Buzz\` if only divisible by 5
- otherwise just the number i

yes, the interview classic. you've got this.`,
    examples: [
      { input: "5", output: "1\n2\nFizz\n4\nBuzz" }
    ],
    tests: [
      { input: "5",  expected: "1\n2\nFizz\n4\nBuzz" },
      { input: "15", expected: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz" },
      { input: "3",  expected: "1\n2\nFizz" },
      { input: "1",  expected: "1" },
    ],
    starter: {
      python: `n = int(input())\nfor i in range(1, n + 1):\n    if i % 15 == 0: print("FizzBuzz")\n    elif i % 3 == 0: print("Fizz")\n    elif i % 5 == 0: print("Buzz")\n    else: print(i)`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    for (int i = 1; i <= n; i++) {\n        if (i % 15 == 0) cout << "FizzBuzz";\n        else if (i % 3 == 0) cout << "Fizz";\n        else if (i % 5 == 0) cout << "Buzz";\n        else cout << i;\n        if (i < n) cout << "\\n";\n    }\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        StringBuilder sb = new StringBuilder();\n        for (int i = 1; i <= n; i++) {\n            if (i % 15 == 0) sb.append("FizzBuzz");\n            else if (i % 3 == 0) sb.append("Fizz");\n            else if (i % 5 == 0) sb.append("Buzz");\n            else sb.append(i);\n            if (i < n) sb.append("\\n");\n        }\n        System.out.print(sb);\n    }\n}`,
      javascript: `const n = parseInt(require('fs').readFileSync(0, 'utf8').trim());\nconst out = [];\nfor (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) out.push("FizzBuzz");\n    else if (i % 3 === 0) out.push("Fizz");\n    else if (i % 5 === 0) out.push("Buzz");\n    else out.push(i);\n}\nconsole.log(out.join("\\n"));`,
      c: `#include <stdio.h>\nint main() {\n    int n; scanf("%d", &n);\n    for (int i = 1; i <= n; i++) {\n        if (i % 15 == 0) printf("FizzBuzz");\n        else if (i % 3 == 0) printf("Fizz");\n        else if (i % 5 == 0) printf("Buzz");\n        else printf("%d", i);\n        if (i < n) printf("\\n");\n    }\n    return 0;\n}`,
    },
  },
  {
    id: "max-of-three",
    title: "biggest of three",
    vibe: "easy",
    difficulty: "easy",
    tags: ["math"],
    statement: `read three integers separated by spaces. print the biggest one.

ties? just print the value (it doesn't matter which "copy" wins).`,
    examples: [
      { input: "3 7 2", output: "7" },
      { input: "5 5 5", output: "5" },
    ],
    tests: [
      { input: "3 7 2",        expected: "7" },
      { input: "5 5 5",        expected: "5" },
      { input: "-1 -5 -3",     expected: "-1" },
      { input: "100 50 75",    expected: "100" },
      { input: "0 0 1",        expected: "1" },
    ],
    starter: {
      python: `a, b, c = map(int, input().split())\nprint(max(a, b, c))`,
      cpp: `#include <iostream>\n#include <algorithm>\nusing namespace std;\nint main() {\n    int a, b, c; cin >> a >> b >> c;\n    cout << max({a, b, c});\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt(), b = sc.nextInt(), c = sc.nextInt();\n        System.out.print(Math.max(a, Math.max(b, c)));\n    }\n}`,
      javascript: `const [a, b, c] = require('fs').readFileSync(0, 'utf8').trim().split(' ').map(Number);\nconsole.log(Math.max(a, b, c));`,
      c: `#include <stdio.h>\nint main() {\n    int a, b, c; scanf("%d %d %d", &a, &b, &c);\n    int m = a;\n    if (b > m) m = b;\n    if (c > m) m = c;\n    printf("%d", m);\n    return 0;\n}`,
    },
  },
  {
    id: "factorial",
    title: "factorial",
    vibe: "medium",
    difficulty: "medium",
    tags: ["math", "loops"],
    statement: `read an integer n (0 ≤ n ≤ 20). print n! (n factorial).

reminder: n! = n × (n-1) × (n-2) × ... × 1, and 0! = 1.`,
    examples: [
      { input: "5", output: "120" },
      { input: "0", output: "1" },
      { input: "10", output: "3628800" },
    ],
    tests: [
      { input: "5",  expected: "120" },
      { input: "0",  expected: "1" },
      { input: "1",  expected: "1" },
      { input: "10", expected: "3628800" },
      { input: "20", expected: "2432902008176640000" },
    ],
    starter: {
      python: `n = int(input())\nresult = 1\nfor i in range(2, n + 1):\n    result *= i\nprint(result)`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    long long n, result = 1;\n    cin >> n;\n    for (long long i = 2; i <= n; i++) result *= i;\n    cout << result;\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        long n = sc.nextLong(), result = 1;\n        for (long i = 2; i <= n; i++) result *= i;\n        System.out.print(result);\n    }\n}`,
      javascript: `const n = parseInt(require('fs').readFileSync(0, 'utf8').trim());\nlet result = 1n;\nfor (let i = 2n; i <= BigInt(n); i++) result *= i;\nconsole.log(result.toString());`,
      c: `#include <stdio.h>\nint main() {\n    long long n, result = 1;\n    scanf("%lld", &n);\n    for (long long i = 2; i <= n; i++) result *= i;\n    printf("%lld", result);\n    return 0;\n}`,
    },
  },
  {
    id: "palindrome",
    title: "is it a palindrome?",
    vibe: "medium",
    difficulty: "medium",
    tags: ["strings"],
    statement: `read a single line of text. print \`yes\` if it reads the same forwards and backwards, \`no\` otherwise. case-sensitive, all characters count.`,
    examples: [
      { input: "racecar", output: "yes" },
      { input: "hello",   output: "no" },
      { input: "abba",    output: "yes" },
    ],
    tests: [
      { input: "racecar",  expected: "yes" },
      { input: "hello",    expected: "no" },
      { input: "abba",     expected: "yes" },
      { input: "a",        expected: "yes" },
      { input: "ab",       expected: "no" },
      { input: "12321",    expected: "yes" },
    ],
    starter: {
      python: `s = input()\nprint("yes" if s == s[::-1] else "no")`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    string s; getline(cin, s);\n    string r(s.rbegin(), s.rend());\n    cout << (s == r ? "yes" : "no");\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine();\n        String r = new StringBuilder(s).reverse().toString();\n        System.out.print(s.equals(r) ? "yes" : "no");\n    }\n}`,
      javascript: `const s = require('fs').readFileSync(0, 'utf8').trim();\nconsole.log(s === s.split('').reverse().join('') ? "yes" : "no");`,
      c: `#include <stdio.h>\n#include <string.h>\nint main() {\n    char s[1005]; fgets(s, 1005, stdin);\n    int n = strlen(s);\n    if (s[n-1] == '\\n') s[--n] = 0;\n    for (int i = 0; i < n / 2; i++) if (s[i] != s[n-1-i]) { printf("no"); return 0; }\n    printf("yes");\n    return 0;\n}`,
    },
  },
  {
    id: "fibonacci",
    title: "fibonacci",
    vibe: "medium",
    difficulty: "medium",
    tags: ["math", "loops"],
    statement: `read an integer n (0 ≤ n ≤ 50). print the nth fibonacci number, where:
- F(0) = 0
- F(1) = 1
- F(n) = F(n-1) + F(n-2)`,
    examples: [
      { input: "0",  output: "0" },
      { input: "10", output: "55" },
    ],
    tests: [
      { input: "0",  expected: "0" },
      { input: "1",  expected: "1" },
      { input: "10", expected: "55" },
      { input: "20", expected: "6765" },
      { input: "30", expected: "832040" },
      { input: "50", expected: "12586269025" },
    ],
    starter: {
      python: `n = int(input())\na, b = 0, 1\nfor _ in range(n):\n    a, b = b, a + b\nprint(a)`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    long long n; cin >> n;\n    long long a = 0, b = 1;\n    for (long long i = 0; i < n; i++) { long long t = a; a = b; b = t + b; }\n    cout << a;\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        long n = sc.nextLong();\n        long a = 0, b = 1;\n        for (long i = 0; i < n; i++) { long t = a; a = b; b = t + b; }\n        System.out.print(a);\n    }\n}`,
      javascript: `const n = parseInt(require('fs').readFileSync(0, 'utf8').trim());\nlet a = 0n, b = 1n;\nfor (let i = 0; i < n; i++) [a, b] = [b, a + b];\nconsole.log(a.toString());`,
      c: `#include <stdio.h>\nint main() {\n    long long n; scanf("%lld", &n);\n    long long a = 0, b = 1;\n    for (long long i = 0; i < n; i++) { long long t = a; a = b; b = t + b; }\n    printf("%lld", a);\n    return 0;\n}`,
    },
  },
  {
    id: "count-vowels",
    title: "count the vowels",
    vibe: "medium",
    difficulty: "medium",
    tags: ["strings"],
    statement: `read a single line of text. count how many vowels appear (a, e, i, o, u — both cases). print just the count.`,
    examples: [
      { input: "hello",       output: "2" },
      { input: "RHYTHM",      output: "0" },
      { input: "Programming", output: "3" },
    ],
    tests: [
      { input: "hello",        expected: "2" },
      { input: "RHYTHM",       expected: "0" },
      { input: "Programming",  expected: "3" },
      { input: "aeiouAEIOU",   expected: "10" },
      { input: "xyz",          expected: "0" },
      { input: "",             expected: "0" },
    ],
    starter: {
      python: `s = input()\nprint(sum(1 for c in s if c.lower() in 'aeiou'))`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\nint main() {\n    string s; getline(cin, s);\n    int count = 0;\n    for (char c : s) {\n        char l = tolower(c);\n        if (l == 'a' || l == 'e' || l == 'i' || l == 'o' || l == 'u') count++;\n    }\n    cout << count;\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.hasNextLine() ? sc.nextLine() : "";\n        int count = 0;\n        for (char c : s.toLowerCase().toCharArray()) if ("aeiou".indexOf(c) >= 0) count++;\n        System.out.print(count);\n    }\n}`,
      javascript: `const s = require('fs').readFileSync(0, 'utf8').replace(/\\n$/, '');\nconsole.log((s.match(/[aeiouAEIOU]/g) || []).length);`,
      c: `#include <stdio.h>\n#include <ctype.h>\n#include <string.h>\nint main() {\n    char s[1005] = "";\n    fgets(s, 1005, stdin);\n    int n = strlen(s);\n    if (n > 0 && s[n-1]=='\\n') s[--n]=0;\n    int count = 0;\n    for (int i = 0; i < n; i++) {\n        char l = tolower(s[i]);\n        if (l=='a'||l=='e'||l=='i'||l=='o'||l=='u') count++;\n    }\n    printf("%d", count);\n    return 0;\n}`,
    },
  },
];
