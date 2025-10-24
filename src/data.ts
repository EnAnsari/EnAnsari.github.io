import * as assert from "assert";

type CVInfo = {
    picture: string,
    description?: string,
    relDistance?: number;
    relSize?: number;
}

export type CVItem = {
    picture: string,
    description?: string,
    depth: number
    relDistance: number;
    relSize: number;
}

export type Tree = {
    item: CVItem,
    children: Tree[]
}

const rootItem: CVItem = {picture: "/static/images/profile.jpg", depth: 0, relSize: 1, relDistance: 1};
const tree = {item: rootItem, children: []};


function findItem(item: CVInfo): Tree {
    function walkTree(tree: Tree): Tree | undefined {
        if(tree.item === item)
            return tree;
        for(const subTree of tree.children) {
            const res = walkTree(subTree);
            if(res !== undefined)
                return res;
        }
        return undefined;
    }
    return walkTree(tree) ?? assert.fail();
}

function addItem(info: CVInfo, parent: CVInfo): CVInfo {
    const parentTree = findItem(parent);
    // MODIFIED: New logic for relSize
    // This will shrink layer 2 (depth 1) and layer 3 (depth 2)
    // but will keep layer 4 (depth 3) the same size as layer 3.
    const newRelSize = (parentTree.item.depth >= 2) // Check if parent is layer 3 (depth 2) or deeper
        ? parentTree.item.relSize // Don't shrink
        : parentTree.item.relSize * 0.65; // Shrink for layers 2 and 3

    const item: CVItem = {
        description: info.description,
        picture: info.picture,
        depth: parentTree.item.depth + 1,
        relDistance: info.relDistance ?? parentTree.item.relDistance * 0.6,
        // MODIFIED: Use the newRelSize logic
        relSize: info.relSize ?? newRelSize
    };
    parentTree.children.push({item: item, children: []});
    return item;
}

export function getTree() {
    return tree;
}


const cvNode = addItem({
    description: "You can download a more formal resume <a href=\"https://rahmat-ml.github.io/files/rahmat-ansari-cv.pdf\">here</a>",
    picture: "/static/images/cv.png",
}, rootItem);

const hsuNode = addItem({
    description: "Grade: 17.65/20 (1st rank - 2020 entrance of computer engineering)",
    picture: "/static/images/hsu.png",
}, rootItem);

const experiencesNode = addItem({
    description: "Server-side programming experiences",
    picture: "/static/images/construction.png",
}, rootItem);

const iustNode = addItem({
    description: "Master's degree student in AI",
    picture: "/static/images/iust.png",
}, rootItem);

const kaggleNode = addItem({
    description: "link: <a href=\"https://www.kaggle.com/enansari\">enansari</a>",
    picture: "/static/images/kaggle.png",
}, iustNode);

const rahmatMlNode = addItem({
    description: "Organization related to AI projects: <a href=\"https://github.com/Rahmat-ML\">Rahmat-ML</a><br>My current personal page: <a href=\"https://rahmat-ml.github.io/\">rahmat-ml.github.io</a>",
    picture: "/static/images/rahmat-ml.png",
}, iustNode);

const linkNode = addItem({
    description: "How to reach me!",
    picture: "/static/images/link.png",
}, rootItem);

const emailNode = addItem({
    description: "<a href=\"mailto:rahmat.ansari.dev@gmail.com\">rahmat.ansari.dev@gmail.com</a>",
    picture: "/static/images/email.png",
}, linkNode);

const linkedinNode = addItem({
    description: "link: <a href=\"https://www.linkedin.com/in/en-r-ansari\">en-r-ansari</a>",
    picture: "/static/images/linkedin.png",
}, linkNode);

const githubNode = addItem({
    description: "link: <a href=\"https://github.com/EnAnsari\">EnAnsari</a>",
    picture: "/static/images/github.png",
}, linkNode);

const telegramNode = addItem({
    description: "my telegram channel: <a href=\"https://t.me/Iibx7\">Iibx7</a>",
    picture: "/static/images/telegram.png",
}, linkNode);

const rahmatJsNode = addItem({
    description: "organization specific to my server-side applications: <a href=\"https://github.com/rahmat-js\">rahmat-js</a>",
    picture: "/static/images/rahmat-js.png",
}, githubNode);

const funCodingLab = addItem({
    description: "organization dedicated to my interesting apps: <a href=\"https://github.com/funCodingLab\">funCodingLab</a>",
    picture: "/static/images/funcodinglab.png",
}, githubNode);

const hsuLugNode = addItem({
    description: "I was one of the three leaders for the year 2023-2024, and with the help of other leaders and enthusiastic students, we held warm and intimate meetings about the latest technology and practical and experimental training in the professional workplace. This group was the most active Linux user group (LUG) in Sabzevar.",
    picture: "/static/images/lug.jpg",
}, hsuNode);

const hsuSscNode = addItem({
    description: "As a member of the Computer Engineering Scientific Association of Hakim Sabzevari University, I participated in many activities. I was the designer of the programming competition and somehow I had a role in correcting it. I also collaborated with other members in many festivals. The cooperating professor of this course was Professor Fasihfar, a member of the computer engineering faculty of Hakim Sabzevari University.",
    picture: "/static/images/ssc-hsu.jpg",
}, hsuNode);

const hsuGithubNode = addItem({
    description: "Some repositories that I have written specifically for Hakim Sabzevari University: <a href=\"https://github.com/hakimuni\">hakimuni</a>",
    picture: "/static/images/github.png",
}, hsuNode);

const icpcNode = addItem({
    description: "During my university years, I represented my university for two consecutive years, and with the help of my wonderful teammates, we were able to achieve 21st and 26th place in the Sharif University of Technology West Asia Regional Competition, <a href=\"https://icpc.global/ICPCID/KD9KWAJE12ZB\">my ICPC ID</a>",
    picture: "/static/images/icpc.png",
}, hsuNode);

const codeforces = addItem({
    description: "handles: <a href=\"https://codeforces.com/profile/enansari\">enansari</a> and <a href=\"https://codeforces.com/profile/pypi0\">pypi0</a>",
    picture: "/static/images/codeforces.png",
}, icpcNode);

const ctrlAltDefeatNode = addItem({
    description: "GitHub organization specific to this team: <a href=\"https://github.com/ctrl-alt-Defeat-icpc\">ctrl-alt-Defeat-icpc</a><br>Together, we succeeded in achieving the 26th ICPC2024 rank in West Asia.<br>webpage: <a href=\"https://ctrl-alt-defeat-icpc.github.io/\">ctrl-alt-defeat-icpc.github.io</a>",
    picture: "/static/images/ctrl-alt-defeat.jpg",
}, icpcNode);

const nutellaNode = addItem({
    description: "GitHub organization specific to this team: <a href=\"https://github.com/Nutella-ICPC\">Nutella-ICPC</a><br>Together, we succeeded in achieving 21st place in ICPC2023 West Asia.",
    picture: "/static/images/nutella.jpg",
}, icpcNode);

const onlyfansNode = addItem({
    description: "GitHub organization specific to this team: <a href=\"https://github.com/onlyfans-icpc\">onlyfans-icpc</a><br>Together, Together, we managed to advance to the Rayan World Finals as the top team in the eastern part of the country. We also managed to qualify for the national finals in the Dotin relief programming competition.",
    picture: "/static/images/github.png",
}, icpcNode);

const rahmatCpNode = addItem({
    description: "GitHub organization dedicated to my codes and programs related to competitive programming: <a href=\"https://github.com/Rahmat-CP\">Rahmat-CP</a>",
    picture: "/static/images/rahmat-cp.png",
}, icpcNode);

const neshanNode = addItem({
    description: "At Neshan I was a back-end mentee",
    picture: "/static/images/neshan.png",
}, experiencesNode);


const partSoftwareGroupNode = addItem({
    description: "I was a back-end intern in Part Software Group",
    picture: "/static/images/part.png",
}, experiencesNode);

const rahmasirNode = addItem({
    description: "In <a href=\"https://github.com/rahmasir\">this repository</a>, I have written all the code related to the Hammasir bootcamp in Neshan",
    picture: "/static/images/rahmasir.png",
}, neshanNode);

const snappMapNode = addItem({
    description: "In <a href=\"https://github.com/snapp-map\">this repository</a>, I have tried to create a simulation of the Snapp app and its affiliates with the help of my friend",
    picture: "/static/images/snapp.png",
}, neshanNode);

const yaranNode = addItem({
    description: "In <a href=\"https://github.com/tiffany-co\">this repository</a>, I wrote a remote application for a private employer using fastapi. I was a server-side programmer.",
    picture: "/static/images/yaran.jpg",
}, experiencesNode);