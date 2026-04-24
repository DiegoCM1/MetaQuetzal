export type ZoneType = 'natural' | 'vial' | 'peligro' | 'ayuda'         
                                                                 
export interface Zone {
  id: string           
  latitude: number
  longitude: number                                                     
  description: string
  timestamp: string                                                     
  radius: number   
  type: ZoneType
}     