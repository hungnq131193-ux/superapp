export type HouseType='nha-ong'|'nha-pho'|'biet-thu-mini'|'can-ho'|'nha-cap-4';
export type RoomType='living'|'kitchen'|'bedroom'|'master'|'wc'|'master-wc'|'worship'|'laundry'|'storage'|'balcony'|'garage'|'stair'|'corridor'|'void'|'yard';
export type StairPreference='middle'|'back'|'side'|'auto';
export interface Plot{width:number;depth:number;floors:number;frontDirection:string;houseType:HouseType;frontYard:boolean;backYard:boolean;void:boolean;parking:'none'|'motorbike'|'car';parkingMode:'auto'|'longitudinal'|'transverse';stair:StairPreference}
export interface AreaRange{min:number;max:number}
export type AreaConfig=Record<string,AreaRange>;
export interface Requirements{bedrooms:number;wcs:number;living:boolean;kitchen:boolean;worship:boolean;laundry:boolean;storage:boolean;balcony:boolean;masterSuite:boolean;privateWorshipAccess:boolean;notes:string}
export interface DesignInput{plot:Plot;requirements:Requirements;areas:AreaConfig;allowWcNearLiving:boolean}
export interface Rect{x:number;y:number;width:number;height:number}
export interface Room extends Rect{id:string;name:string;type:RoomType;floor:number;targetArea:number;locked?:boolean}
export interface Floor{level:number;rooms:Room[]}
export interface ValidationIssue{severity:'error'|'warning'|'info';message:string;roomIds?:string[]}
export interface LayoutScore{total:number;areaFit:number;circulation:number;adjacency:number;light:number;technical:number;explanations:string[]}
export interface Layout{id:string;name:string;input:DesignInput;floors:Floor[];score:LayoutScore;issues:ValidationIssue[];createdAt:string}
