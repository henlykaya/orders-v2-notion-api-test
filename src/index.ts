import { Client } from "@notionhq/client";
import { DatabaseObjectResponse, PageObjectResponse, PartialDatabaseObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { config } from 'dotenv';

config();

interface Order {
    status: string,
    orderNumber: string,
    title: string,
    img: string,
    price: number,
    rating: number
}

interface Project {

    phase: string,
    name: string,
    img: string,
    percentage: number,
    number: string,
    model: string,
    deliveryDate: string,
    orders: Order[]
}

const start = async () => {
    const projectsDB = process.env['PROJECTS_DB']!;
    const ordersDB = process.env['ORDERS_DB']!;
    const notionClient = new Client({ auth: process.env['NOTION_INTEGRATION_TOKEN']! });
    const projects = (await notionClient.databases.query({ database_id: projectsDB })).results as DatabaseObjectResponse[];
    const orders = (await notionClient.databases.query({ database_id: ordersDB })).results as DatabaseObjectResponse[];

    let ordersByProjectID = new Map<string, DatabaseObjectResponse[]>();

    orders.forEach(order => {
        const { id, type, relation }: { id: string, type: string, relation: { id: string }[] } = JSON.parse(JSON.stringify(order.properties['Project Name']));
        if (relation != null && relation.length > 0) {
            const projectNameID = relation[0].id;
            if (ordersByProjectID.has(projectNameID)) {
                const currentOrdersOfProject = ordersByProjectID.get(projectNameID);
                if (currentOrdersOfProject != null) {
                    ordersByProjectID.set(projectNameID, [...currentOrdersOfProject, order]);
                }
            } else {
                ordersByProjectID.set(projectNameID, [order]);
            }
        }
    });


    const projectsByModel = new Map<string, string[]>();

    for (const projectID of ordersByProjectID.keys()) {
        const project = projects.find(p => p.id === projectID);
        const name = JSON.parse(JSON.stringify(project?.properties['HomeTypes (WH Only)'])).select?.name;
        if (name != null) {
            if (projectsByModel.has(name)) {
                const currentModel = projectsByModel.get(name);
                if (currentModel != null) {
                    projectsByModel.set(name, [...currentModel, projectID]);
                }
            } else {
                projectsByModel.set(name, [projectID])
            }
        }
    }

    console.log({ projectsByModel });
    console.log({ ordersByProjectID });
}

start();