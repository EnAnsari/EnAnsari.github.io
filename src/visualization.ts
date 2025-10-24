import * as d3 from 'd3';
import * as assert from "assert";
import {Tooltip} from "./tooltip";

export interface Node extends d3.SimulationNodeDatum {
    id: string;
    image: string;
    description: string;
    relSize: number;
    relDistance: number;
    x?: number;
    y?: number;
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    source: Node; // parent
    target: Node; // child
}

export class GraphVisualizer {
    private readonly nodes: Node[] = [];
    private readonly links: Link[] = [];
    private readonly config: { linkDistanceUnit: number, chargeStrength: number, circleRadiusUnit: number };
    private readonly simulation: d3.Simulation<Node, Link>;
    private hideTask: () => void;

    // ADDED: A main group <g> to hold all visual elements (nodes, links)
    // This group will be transformed by the zoom behavior
    private readonly mainGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
    
    // UPDATED: The container is the root <svg> element
    private readonly svgElement: SVGSVGElement;


    public constructor(
        // UPDATED: Changed type from SVGGElement to SVGSVGElement
        private readonly container: SVGSVGElement,
    ) {
        this.svgElement = container;
        const sizeFactor = Math.min(this.svgElement.clientWidth, this.svgElement.clientHeight) / 1000;
        this.config = {
            linkDistanceUnit: 300 * sizeFactor,
            circleRadiusUnit: 80 * sizeFactor,
            chargeStrength: -60 * sizeFactor
        };

        // ADDED: Create the main group <g>
        this.mainGroup = d3.select(this.svgElement).append('g');

        // ADDED: Set up zoom and pan (which works for touch and mouse)
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4]) // Min/max zoom levels
            .on('zoom', (event) => {
                // Apply the zoom transform to the main group
                this.mainGroup.attr('transform', event.transform);
            });
        
        // Apply the zoom behavior to the main SVG element
        d3.select(this.svgElement)
          .call(zoom as any)
          .on("dblclick.zoom", null); // Disable double-click to zoom


        this.simulation = d3.forceSimulation<Node, Link>(this.nodes)
            .on('tick', () => this.ticked());
        this.applyAllForces();

        this.simulation.velocityDecay(0.05);
        this.hideTask = () => {
        };

        this.registerResize();
    }

    public addNode(node: Node) {
        this.nodes.push(node);
        this.update();
    }

    public addLink(link: Link) {
        this.links.push(link);
        this.update();
    }

    private update() {
        // UPDATED: All selections now happen within this.mainGroup
        this.mainGroup
            .selectAll<SVGGElement, Node>('.node')
            .data(this.nodes, d => d.id)
            .join(
                enter => {
                    const nodeEnter = enter
                        .append('g')
                        .attr('class', 'node')
                        .call(d3.drag<SVGGElement, Node>()
                            .on('start', (event, node) => this.dragstarted(event, node))
                            .on('drag', (event, node) => this.dragged(event, node))
                            .on('end', (event, node) => this.dragended(event, node)))
                        .append('g')
                        .attr('class', 'inner-node');

                    nodeEnter // white background
                        .append('circle')
                        .attr('r', d => d.relSize * this.config.circleRadiusUnit)
                        .attr('fill', d => 'white');
                    nodeEnter // image background
                        .append('circle')
                        .attr('r', d => d.relSize * this.config.circleRadiusUnit)
                        .attr('fill', d => `url(#${'pattern' + d.id})`);
                    
                    // UPDATED: Select 'defs' from the root container (SVG)
                    // Definitions should be at the top level, not inside the zoomable group
                    nodeEnter.each(d =>
                        d3.select(this.svgElement)
                            .append('defs')
                            .append('pattern')
                            .attr('id', 'pattern' + d.id)
                            .attr('patternUnits', 'userSpaceOnUse')
                            .attr('x', -d.relSize * this.config.circleRadiusUnit)
                            .attr('y', -d.relSize * this.config.circleRadiusUnit)
                            .attr('width', d.relSize * this.config.circleRadiusUnit * 2)
                            .attr('height', d.relSize * this.config.circleRadiusUnit * 2)
                            .append("image")
                            .attr("xlink:href", d.image)
                            .attr('width', d.relSize * this.config.circleRadiusUnit * 2)
                            .attr('height', d.relSize * this.config.circleRadiusUnit * 2)
                    )

                    let tip = new Tooltip();
                    document.body.appendChild(tip.getNode());

                    let that = this;
                    let showTimeout: NodeJS.Timeout;

                    tip.getNode().onmouseover = (() => {
                        clearTimeout(showTimeout)
                    });
                    tip.getNode().onmouseout = ( () => {
                        showTimeout = setTimeout(this.hideTask, 800)
                    });

                    nodeEnter.filter((d: Node) => {
                        return d.description !== undefined && d.description.length > 0;
                    }).on('mouseover', function (...args) {
                        clearTimeout(showTimeout)
                        tip.setData(...args, that.config.circleRadiusUnit);
                        that.hideTask();
                        tip.show();
                    }).on('mouseout', function (...args) {
                        that.hideTask = () => tip.hide();
                        showTimeout = setTimeout(that.hideTask, 800)
                    });

                    return nodeEnter;
                },
                undefined,
                exit => exit.remove());

        // UPDATED: All selections now happen within this.mainGroup
        this.mainGroup
            .selectAll<SVGLineElement, Link>('.link')
            .data(this.links, (d) => `${d.source.id}-${d.target.id}`)
            .join(
                enter => enter
                    .append('line')
                    .attr('class', 'link'),
                update => update,
                exit => exit.remove());

        // Update the simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link', d3.forceLink<Node, Link>(this.links).strength(0.07)
            .distance((link) => link.target.relDistance * this.config.linkDistanceUnit));
        this.simulation.alpha(0.3).restart();

        // re-order line and nodes
        // UPDATED: All selections now happen within this.mainGroup
        this.mainGroup.selectAll<SVGLineElement, Link>('.link')
            .each(function (link) {
                const linkElement = this;
                linkElement.parentNode?.insertBefore(linkElement, linkElement.parentNode.firstChild);
            });
    }

    private selectLinks() {
        // UPDATED: All selections now happen within this.mainGroup
        return this.mainGroup.selectAll<SVGLineElement, Link>('.link').data(this.links);
    }

    private selectNodes() {
        // UPDATED: All selections now happen within this.mainGroup
        return this.mainGroup.selectAll<SVGGElement, Node>('.node').data(this.nodes);
    }

    private dragstarted(event: any, d: Node) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        // Use event.x and event.y directly, as they are in the coordinate system of the mainGroup
        d.fx = event.x;
        d.fy = event.y;
    }

    private dragged(event: any, d: Node) {
        d.fx = event.x;
        d.fy = event.y;
    }

    private dragended(event: any, d: Node) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    private ticked() {
        this.selectLinks()
            .attr('x1', (d) => d.source?.x ?? assert.fail())
            .attr('y1', (d) => d.source?.y ?? assert.fail())
            .attr('x2', (d) => d.target?.x ?? assert.fail())
            .attr('y2', (d) => d.target?.y ?? assert.fail());
        this.selectNodes()
            .attr('transform', (d) => `translate(${d.x}, ${d.y})`);
    }

    private registerResize() {
        let lastResizeTimeout: NodeJS.Timeout | undefined;

        // This correctly observes the main SVG element
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (lastResizeTimeout !== undefined) {
                    clearTimeout(lastResizeTimeout);
                }
                // Set a new timeout to execute the resize logic after 1 second of inactivity
                lastResizeTimeout = setTimeout(() => {
                    // Update scale factor based on new size
                    const sizeFactor = Math.min(this.svgElement.clientWidth, this.svgElement.clientHeight) / 1000;
                    this.config.linkDistanceUnit = 300 * sizeFactor;
                    this.config.circleRadiusUnit = 80 * sizeFactor;
                    this.config.chargeStrength = -60 * sizeFactor;

                    this.applyAllForces();
                    this.simulation.alpha(1).restart();
                    lastResizeTimeout = undefined;
                }, 500); // Reduced delay to 500ms
            }
        });
        resizeObserver.observe(this.svgElement);
    }

    private applyCenterForce() {
        // This correctly centers the simulation in the middle of the SVG element
        this.simulation.force('center', d3.forceCenter(this.svgElement.clientWidth / 2, this.svgElement.clientHeight / 2)
            .strength(0.1));
    }

    private applyBoundaryForce() {
        const boundaryForce = (params: { width: number, height: number, strength: number }) => {
            return (alpha: number) => {
                for (const node of this.simulation.nodes()) {
                    const {x, y, vx, vy} = node;
                    const radius = node.relSize * this.config.circleRadiusUnit;
                    // Updated limits to use radius
                    const xminlim = radius;
                    const xmaxlim = params.width - radius;
                    const yminlim = radius;
                    const ymaxlim = params.height - radius;

                    if (x !== undefined && vx !== undefined && x <= xminlim) {
                        node.vx = vx + (xminlim - x) * params.strength * alpha;
                    } else if (x !== undefined && vx !== undefined && x >= xmaxlim) {
                        node.vx = vx + (xmaxlim - x) * params.strength * alpha;
                    }

                    if (y !== undefined && vy !== undefined && y <= yminlim) {
                        node.vy = vy + (yminlim - y) * params.strength * alpha;
                    } else if (y !== undefined && vy !== undefined && y >= ymaxlim) {
                        node.vy = vy + (ymaxlim - y) * params.strength * alpha;
                    }
                }
            };
        };
        // This correctly sets the boundaries to the SVG element's size
        this.simulation.force('boundary', boundaryForce(
            {width: this.svgElement.clientWidth, height: this.svgElement.clientHeight, strength: 0.3}));
    }

    private applyChargeForce() {
        this.simulation.force("charge", d3.forceManyBody().strength(this.config.chargeStrength));
    }

    private applyCollideForce() {
        this.simulation.force("collide", d3.forceCollide<Node>()
            .radius(d => d.relSize * this.config.circleRadiusUnit + 10)); // Added a small buffer
    }

    private applyAllForces() {
        this.applyCollideForce();
        this.applyChargeForce();
        this.applyCenterForce();
        this.applyBoundaryForce();
    }
}

