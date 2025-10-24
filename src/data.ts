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
    const item: CVItem = {
        description: info.description,
        picture: info.picture,
        depth: parentTree.item.depth + 1,
        relDistance: info.relDistance ?? parentTree.item.relDistance * 0.6,
        relSize: info.relSize ?? parentTree.item.relSize * 0.65
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

const hsuLugNode = addItem({
    description: "I was one of the three leaders for the year 2023-2024, and with the help of other leaders and enthusiastic students, we held warm and intimate meetings about the latest technology and practical and experimental training in the professional workplace. This group was the most active Linux user group (LUG) in Sabzevar.",
    picture: "/static/images/lug.jpg",
}, hsuNode);

const hsuSscNode = addItem({
    description: "As a member of the Computer Engineering Scientific Association of Hakim Sabzevari University, I participated in many activities. I was the designer of the programming competition and somehow I had a role in correcting it. I also collaborated with other members in many festivals. The cooperating professor of this course was Professor Fasihfar, a member of the computer engineering faculty of Hakim Sabzevari University.",
    picture: "/static/images/ssc-hsu.jpg",
}, hsuNode);

