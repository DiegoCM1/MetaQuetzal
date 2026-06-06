export type ZoneType = 'natural' | 'vial' | 'peligro' | 'ayuda'         
                                                                 
export interface Zone {
  id: string           
  latitude: number
  longitude: number                                                     
  description: string
  timestamp: string                                                     
  radius: number   
  type: ZoneType
  upvotes?: number
  downvotes?: number
  userVote?: 1 | -1 | null
  isOwner?: boolean
  distanceKm?: number | null
  withinVotingRadius?: boolean
  canVote?: boolean
  trustStatus?: 'confirmado' | 'en_revision' | 'dudoso'
}     
