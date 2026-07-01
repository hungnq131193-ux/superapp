import type {AreaConfig,DesignInput} from '../types';
export const vietnamAreaConfig:AreaConfig={living:{min:16,max:28},kitchen:{min:12,max:24},bedroom:{min:10,max:16},master:{min:16,max:26},wc:{min:3,max:5},'master-wc':{min:4,max:7},worship:{min:6,max:12},garage:{min:16,max:26},stair:{min:8,max:14},void:{min:4,max:10},laundry:{min:4,max:8},storage:{min:3,max:6},balcony:{min:3,max:8},yard:{min:6,max:18},corridor:{min:4,max:10}};
export const defaultInput:DesignInput={plot:{width:5,depth:18,floors:3,frontDirection:'Đông Nam',houseType:'nha-ong',frontYard:true,backYard:false,void:true,parking:'car',parkingMode:'auto',stair:'auto'},requirements:{bedrooms:3,wcs:3,living:true,kitchen:true,worship:true,laundry:true,storage:false,balcony:true,masterSuite:true,privateWorshipAccess:true,notes:''},areas:vietnamAreaConfig,allowWcNearLiving:false};
export const presets=[
{name:'Nhà ống 5m x 18m, 3 tầng, có gara',patch:{plot:{width:5,depth:18,floors:3,parking:'car'},requirements:{bedrooms:3,wcs:3}}},
{name:'Nhà ống 4.5m x 20m, 3 tầng, 4 phòng ngủ',patch:{plot:{width:4.5,depth:20,floors:3,parking:'motorbike'},requirements:{bedrooms:4,wcs:3}}},
{name:'Nhà 1 tầng 90m², 3 phòng ngủ',patch:{plot:{width:9,depth:10,floors:1,houseType:'nha-cap-4',parking:'motorbike'},requirements:{bedrooms:3,wcs:2,worship:false}}},
{name:'Nhà phố 6m x 15m, 2 tầng',patch:{plot:{width:6,depth:15,floors:2,houseType:'nha-pho'},requirements:{bedrooms:3,wcs:2}}},
{name:'89–90m² tối ưu nhà phố Việt Nam',patch:{plot:{width:5,depth:18,floors:2,houseType:'nha-pho'},requirements:{bedrooms:4,wcs:3,storage:true}}}
];
