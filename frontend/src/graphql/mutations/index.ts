import { gql } from '@apollo/client'
import { FARM_FIELDS } from '../queries'

// ── Farm ────────────────────────────────────────────────────────────────────
// Both mutations return the same FarmFields shape as MY_FARMS so FarmFormModal
// can write the result straight into that query's cache without a refetch.
export const CREATE_FARM = gql`
  mutation CreateFarm($input: FarmInput!) {
    createFarm(input: $input) {
      ...FarmFields
    }
  }
  ${FARM_FIELDS}
`

export const UPDATE_FARM = gql`
  mutation UpdateFarm($farmId: ID!, $input: FarmInput!) {
    updateFarm(farmId: $farmId, input: $input) {
      ...FarmFields
    }
  }
  ${FARM_FIELDS}
`

export const DELETE_FARM = gql`
  mutation DeleteFarm($farmId: ID!) {
    deleteFarm(farmId: $farmId)
  }
`

export const SET_FARM_ACTIVE = gql`
  mutation SetFarmActive($farmId: ID!, $isActive: Boolean!) {
    setFarmActive(farmId: $farmId, isActive: $isActive) {
      id
      isActive
    }
  }
`

// Always sets $farmId as the default and unsets any previous default farm
// owned by the same user — the backend enforces "at most one default" so
// there's nothing to toggle off from here.
export const SET_FARM_DEFAULT = gql`
  mutation SetFarmDefault($farmId: ID!) {
    setFarmDefault(farmId: $farmId) {
      id
      isDefault
    }
  }
`

// ── Farm membership / RBAC ───────────────────────────────────────────────────
export const INVITE_MEMBER = gql`
  mutation InviteMember($input: InviteMemberInput!) {
    inviteMember(input: $input) {
      id
      role
      joinedAt
      user {
        id
        username
        email
        firstName
        lastName
      }
    }
  }
`

export const UPDATE_MEMBER_ROLE = gql`
  mutation UpdateMemberRole($farmId: ID!, $userId: ID!, $role: String!) {
    updateMemberRole(farmId: $farmId, userId: $userId, role: $role) {
      id
      role
    }
  }
`

export const REMOVE_MEMBER = gql`
  mutation RemoveMember($farmId: ID!, $userId: ID!) {
    removeMember(farmId: $farmId, userId: $userId)
  }
`

// ── Supplier (global directory) ──────────────────────────────────────────────
export const CREATE_SUPPLIER = gql`
  mutation CreateSupplier($input: SupplierInput!) {
    createSupplier(input: $input) {
      id
      name
      phone
      location
      notes
      productUrl
    }
  }
`

export const UPDATE_SUPPLIER = gql`
  mutation UpdateSupplier($supplierId: ID!, $input: SupplierInput!) {
    updateSupplier(supplierId: $supplierId, input: $input) {
      id
      name
      phone
      location
      notes
      productUrl
    }
  }
`

export const DELETE_SUPPLIER = gql`
  mutation DeleteSupplier($supplierId: ID!) {
    deleteSupplier(supplierId: $supplierId)
  }
`

// ── Crop (global catalog) ────────────────────────────────────────────────────
export const CREATE_CROP = gql`
  mutation CreateCrop($input: CropInput!) {
    createCrop(input: $input) {
      id
      name
      category
      notes
    }
  }
`

export const UPDATE_CROP = gql`
  mutation UpdateCrop($cropId: ID!, $input: CropInput!) {
    updateCrop(cropId: $cropId, input: $input) {
      id
      name
      category
      notes
    }
  }
`

export const DELETE_CROP = gql`
  mutation DeleteCrop($cropId: ID!) {
    deleteCrop(cropId: $cropId)
  }
`

export const CREATE_PLANTING = gql`
  mutation CreatePlanting($input: CropPlantingInput!) {
    createPlanting(input: $input) {
      id
      acreage
      plantingDate
      expectedHarvestDate
      season
      status
      seedlingQuantityKg
      crop {
        id
        name
      }
      seedling {
        id
        name
      }
    }
  }
`

export const UPDATE_PLANTING = gql`
  mutation UpdatePlanting($plantingId: ID!, $input: CropPlantingUpdateInput!) {
    updatePlanting(plantingId: $plantingId, input: $input) {
      id
      acreage
      plantingDate
      expectedHarvestDate
      season
      status
      notes
      seedlingQuantityKg
      crop {
        id
        name
      }
      seedling {
        id
        name
      }
    }
  }
`

export const UPDATE_PLANTING_STATUS = gql`
  mutation UpdatePlantingStatus($plantingId: ID!, $status: String!) {
    updatePlantingStatus(plantingId: $plantingId, status: $status) {
      id
      status
    }
  }
`

export const DELETE_PLANTING = gql`
  mutation DeletePlanting($plantingId: ID!) {
    deletePlanting(plantingId: $plantingId)
  }
`

export const RECORD_YIELD = gql`
  mutation RecordYield($input: CropYieldInput!) {
    recordYield(input: $input) {
      id
      harvestDate
      quantity
      unit
      unitPrice
      totalRevenue
    }
  }
`

export const UPDATE_YIELD = gql`
  mutation UpdateYield($yieldId: ID!, $input: CropYieldInput!) {
    updateYield(yieldId: $yieldId, input: $input) {
      id
      harvestDate
      quantity
      unit
      qualityGrade
      unitPrice
      totalRevenue
      notes
    }
  }
`

export const DELETE_YIELD = gql`
  mutation DeleteYield($yieldId: ID!) {
    deleteYield(yieldId: $yieldId)
  }
`

export const REPORT_CROP_DAMAGE = gql`
  mutation ReportCropDamage($input: CropDamageInput!) {
    reportCropDamage(input: $input) {
      id
      damageType
      severity
      dateReported
      areaAffectedAcres
    }
  }
`

export const UPDATE_CROP_DAMAGE = gql`
  mutation UpdateCropDamage($damageId: ID!, $input: CropDamageInput!) {
    updateCropDamage(damageId: $damageId, input: $input) {
      id
      damageType
      severity
      dateReported
      areaAffectedAcres
      estimatedLossValue
      description
    }
  }
`

export const DELETE_CROP_DAMAGE = gql`
  mutation DeleteCropDamage($damageId: ID!) {
    deleteCropDamage(damageId: $damageId)
  }
`

export const REPORT_PEST_INCIDENT = gql`
  mutation ReportPestIncident($input: PestIncidentInput!) {
    reportPestIncident(input: $input) {
      id
      pestName
      dateObserved
      severity
      areaAffectedAcres
    }
  }
`

export const UPDATE_PEST_INCIDENT = gql`
  mutation UpdatePestIncident($incidentId: ID!, $input: PestIncidentInput!) {
    updatePestIncident(incidentId: $incidentId, input: $input) {
      id
      pestName
      dateObserved
      severity
      areaAffectedAcres
      actionTaken
      notes
    }
  }
`

export const DELETE_PEST_INCIDENT = gql`
  mutation DeletePestIncident($incidentId: ID!) {
    deletePestIncident(incidentId: $incidentId)
  }
`

export const CREATE_PESTICIDE = gql`
  mutation CreatePesticide($input: PesticideInput!) {
    createPesticide(input: $input) {
      id
      name
      pesticideType
      notes
      productUrl
      imageUrl
    }
  }
`

export const UPDATE_PESTICIDE = gql`
  mutation UpdatePesticide($pesticideId: ID!, $input: PesticideInput!) {
    updatePesticide(pesticideId: $pesticideId, input: $input) {
      id
      name
      pesticideType
      activeIngredient
      targetPests
      preHarvestIntervalDays
      notes
      productUrl
      imageUrl
    }
  }
`

export const DELETE_PESTICIDE = gql`
  mutation DeletePesticide($pesticideId: ID!) {
    deletePesticide(pesticideId: $pesticideId)
  }
`

export const APPLY_PESTICIDE = gql`
  mutation ApplyPesticide($input: PesticideApplicationInput!) {
    applyPesticide(input: $input) {
      id
    }
  }
`

export const UPDATE_PESTICIDE_APPLICATION = gql`
  mutation UpdatePesticideApplication($applicationId: ID!, $input: PesticideApplicationInput!) {
    updatePesticideApplication(applicationId: $applicationId, input: $input) {
      id
    }
  }
`

export const DELETE_PESTICIDE_APPLICATION = gql`
  mutation DeletePesticideApplication($applicationId: ID!) {
    deletePesticideApplication(applicationId: $applicationId)
  }
`

export const DELETE_PESTICIDE_APPLICATION_ALLOCATION = gql`
  mutation DeletePesticideApplicationAllocation($allocationId: ID!) {
    deletePesticideApplicationAllocation(allocationId: $allocationId)
  }
`

export const REPORT_FENCE_DAMAGE = gql`
  mutation ReportFenceDamage($input: FenceDamageInput!) {
    reportFenceDamage(input: $input) {
      id
      locationDescription
      damageType
      dateReported
      severity
      repairStatus
    }
  }
`

export const UPDATE_FENCE_DAMAGE = gql`
  mutation UpdateFenceDamage($damageId: ID!, $input: FenceDamageInput!) {
    updateFenceDamage(damageId: $damageId, input: $input) {
      id
      locationDescription
      damageType
      dateReported
      severity
      notes
    }
  }
`

export const DELETE_FENCE_DAMAGE = gql`
  mutation DeleteFenceDamage($damageId: ID!) {
    deleteFenceDamage(damageId: $damageId)
  }
`

export const UPDATE_FENCE_REPAIR = gql`
  mutation UpdateFenceRepair($damageId: ID!, $input: FenceRepairInput!) {
    updateFenceRepair(damageId: $damageId, input: $input) {
      id
      repairStatus
      repairCost
      dateRepaired
    }
  }
`

// ── Livestock ────────────────────────────────────────────────────────────────
export const RECORD_CENSUS = gql`
  mutation RecordCensus($input: LivestockCensusInput!) {
    recordCensus(input: $input) {
      id
      animalType
      censusDate
      totalCount
      maleCount
      femaleCount
      juvenileCount
    }
  }
`

export const UPDATE_CENSUS = gql`
  mutation UpdateCensus($censusId: ID!, $input: LivestockCensusInput!) {
    updateCensus(censusId: $censusId, input: $input) {
      id
      animalType
      censusDate
      totalCount
      maleCount
      femaleCount
      juvenileCount
      notes
    }
  }
`

export const DELETE_CENSUS = gql`
  mutation DeleteCensus($censusId: ID!) {
    deleteCensus(censusId: $censusId)
  }
`

export const RECORD_LIVESTOCK_EVENT = gql`
  mutation RecordLivestockEvent($input: LivestockEventInput!) {
    recordLivestockEvent(input: $input) {
      id
      animalType
      eventType
      eventDate
      count
      unitValue
      totalValue
    }
  }
`

export const UPDATE_LIVESTOCK_EVENT = gql`
  mutation UpdateLivestockEvent($eventId: ID!, $input: LivestockEventInput!) {
    updateLivestockEvent(eventId: $eventId, input: $input) {
      id
      animalType
      eventType
      eventDate
      count
      unitValue
      totalValue
      causeOfDeath
      notes
    }
  }
`

export const DELETE_LIVESTOCK_EVENT = gql`
  mutation DeleteLivestockEvent($eventId: ID!) {
    deleteLivestockEvent(eventId: $eventId)
  }
`

export const RECORD_EGG_PRODUCTION = gql`
  mutation RecordEggProduction($input: EggProductionInput!) {
    recordEggProduction(input: $input) {
      id
      birdType
      productionDate
      totalEggs
      damagedEggs
      soldEggs
      goodEggs
      unitPrice
      totalRevenue
    }
  }
`

export const UPDATE_EGG_PRODUCTION = gql`
  mutation UpdateEggProduction($recordId: ID!, $input: EggProductionInput!) {
    updateEggProduction(recordId: $recordId, input: $input) {
      id
      birdType
      productionDate
      totalEggs
      damagedEggs
      soldEggs
      goodEggs
      unitPrice
      totalRevenue
      notes
    }
  }
`

export const DELETE_EGG_PRODUCTION = gql`
  mutation DeleteEggProduction($recordId: ID!) {
    deleteEggProduction(recordId: $recordId)
  }
`

// ── Inputs ────────────────────────────────────────────────────────────────────
export const CREATE_VET_DRUG = gql`
  mutation CreateVetDrug($input: VeterinaryDrugInput!) {
    createVetDrug(input: $input) {
      id
      name
      drugType
      targetSpecies
      notes
      productUrl
      imageUrl
    }
  }
`

export const UPDATE_VET_DRUG = gql`
  mutation UpdateVetDrug($drugId: ID!, $input: VeterinaryDrugInput!) {
    updateVetDrug(drugId: $drugId, input: $input) {
      id
      name
      drugType
      activeIngredient
      targetSpecies
      dosageInstructions
      withdrawalPeriodDays
      notes
      productUrl
      imageUrl
    }
  }
`

export const DELETE_VET_DRUG = gql`
  mutation DeleteVetDrug($drugId: ID!) {
    deleteVetDrug(drugId: $drugId)
  }
`

export const RECORD_TREATMENT = gql`
  mutation RecordTreatment($input: AnimalTreatmentInput!) {
    recordTreatment(input: $input) {
      id
    }
  }
`

export const UPDATE_TREATMENT = gql`
  mutation UpdateTreatment($treatmentId: ID!, $input: AnimalTreatmentInput!) {
    updateTreatment(treatmentId: $treatmentId, input: $input) {
      id
    }
  }
`

export const DELETE_TREATMENT = gql`
  mutation DeleteTreatment($treatmentId: ID!) {
    deleteTreatment(treatmentId: $treatmentId)
  }
`

export const DELETE_TREATMENT_ALLOCATION = gql`
  mutation DeleteTreatmentAllocation($allocationId: ID!) {
    deleteTreatmentAllocation(allocationId: $allocationId)
  }
`

export const CREATE_FEED = gql`
  mutation CreateFeed($input: AnimalFeedInput!) {
    createFeed(input: $input) {
      id
      name
      feedType
      notes
      productUrl
      imageUrl
    }
  }
`

export const UPDATE_FEED = gql`
  mutation UpdateFeed($feedId: ID!, $input: AnimalFeedInput!) {
    updateFeed(feedId: $feedId, input: $input) {
      id
      name
      feedType
      targetSpecies
      nutritionalInfo
      notes
      productUrl
      imageUrl
    }
  }
`

export const DELETE_FEED = gql`
  mutation DeleteFeed($feedId: ID!) {
    deleteFeed(feedId: $feedId)
  }
`

export const RECORD_FEEDING = gql`
  mutation RecordFeeding($input: FeedRecordInput!) {
    recordFeeding(input: $input) {
      id
    }
  }
`

export const UPDATE_FEED_RECORD = gql`
  mutation UpdateFeedRecord($recordId: ID!, $input: FeedRecordInput!) {
    updateFeedRecord(recordId: $recordId, input: $input) {
      id
    }
  }
`

export const DELETE_FEED_RECORD = gql`
  mutation DeleteFeedRecord($recordId: ID!) {
    deleteFeedRecord(recordId: $recordId)
  }
`

export const DELETE_FEED_RECORD_ALLOCATION = gql`
  mutation DeleteFeedRecordAllocation($allocationId: ID!) {
    deleteFeedRecordAllocation(allocationId: $allocationId)
  }
`

// ── Seedlings ──────────────────────────────────────────────────────────────
export const CREATE_SEEDLING = gql`
  mutation CreateSeedling($input: SeedlingInput!) {
    createSeedling(input: $input) {
      id
      name
      maturityDays
      notes
      productUrl
      imageUrl
      crop {
        id
        name
      }
    }
  }
`

export const UPDATE_SEEDLING = gql`
  mutation UpdateSeedling($seedlingId: ID!, $input: SeedlingInput!) {
    updateSeedling(seedlingId: $seedlingId, input: $input) {
      id
      name
      maturityDays
      notes
      productUrl
      imageUrl
      crop {
        id
        name
      }
    }
  }
`

export const DELETE_SEEDLING = gql`
  mutation DeleteSeedling($seedlingId: ID!) {
    deleteSeedling(seedlingId: $seedlingId)
  }
`

export const RECORD_SEEDLING_PURCHASE = gql`
  mutation RecordSeedlingPurchase($input: SeedlingPurchaseInput!) {
    recordSeedlingPurchase(input: $input) {
      id
    }
  }
`

export const UPDATE_SEEDLING_PURCHASE = gql`
  mutation UpdateSeedlingPurchase($purchaseId: ID!, $input: SeedlingPurchaseInput!) {
    updateSeedlingPurchase(purchaseId: $purchaseId, input: $input) {
      id
    }
  }
`

export const DELETE_SEEDLING_PURCHASE = gql`
  mutation DeleteSeedlingPurchase($purchaseId: ID!) {
    deleteSeedlingPurchase(purchaseId: $purchaseId)
  }
`

export const DELETE_SEEDLING_PURCHASE_ALLOCATION = gql`
  mutation DeleteSeedlingPurchaseAllocation($allocationId: ID!) {
    deleteSeedlingPurchaseAllocation(allocationId: $allocationId)
  }
`

// ── Soil inputs ──────────────────────────────────────────────────────────────
export const CREATE_SOIL_INPUT = gql`
  mutation CreateSoilInput($input: SoilInputCatalogInput!) {
    createSoilInput(input: $input) {
      id
      name
      inputType
      notes
      productUrl
      imageUrl
    }
  }
`

export const UPDATE_SOIL_INPUT = gql`
  mutation UpdateSoilInput($soilInputId: ID!, $input: SoilInputCatalogInput!) {
    updateSoilInput(soilInputId: $soilInputId, input: $input) {
      id
      name
      inputType
      notes
      productUrl
      imageUrl
    }
  }
`

export const DELETE_SOIL_INPUT = gql`
  mutation DeleteSoilInput($soilInputId: ID!) {
    deleteSoilInput(soilInputId: $soilInputId)
  }
`

export const RECORD_SOIL_TREATMENT = gql`
  mutation RecordSoilTreatment($input: SoilTreatmentInput!) {
    recordSoilTreatment(input: $input) {
      id
    }
  }
`

export const UPDATE_SOIL_TREATMENT = gql`
  mutation UpdateSoilTreatment($treatmentId: ID!, $input: SoilTreatmentInput!) {
    updateSoilTreatment(treatmentId: $treatmentId, input: $input) {
      id
    }
  }
`

export const DELETE_SOIL_TREATMENT = gql`
  mutation DeleteSoilTreatment($treatmentId: ID!) {
    deleteSoilTreatment(treatmentId: $treatmentId)
  }
`

export const DELETE_SOIL_TREATMENT_ALLOCATION = gql`
  mutation DeleteSoilTreatmentAllocation($allocationId: ID!) {
    deleteSoilTreatmentAllocation(allocationId: $allocationId)
  }
`

export const RECORD_SOIL_INPUT_PURCHASE = gql`
  mutation RecordSoilInputPurchase($input: SoilInputPurchaseInput!) {
    recordSoilInputPurchase(input: $input) {
      id
    }
  }
`

export const UPDATE_SOIL_INPUT_PURCHASE = gql`
  mutation UpdateSoilInputPurchase($purchaseId: ID!, $input: SoilInputPurchaseInput!) {
    updateSoilInputPurchase(purchaseId: $purchaseId, input: $input) {
      id
    }
  }
`

export const DELETE_SOIL_INPUT_PURCHASE = gql`
  mutation DeleteSoilInputPurchase($purchaseId: ID!) {
    deleteSoilInputPurchase(purchaseId: $purchaseId)
  }
`

export const DELETE_SOIL_INPUT_PURCHASE_ALLOCATION = gql`
  mutation DeleteSoilInputPurchaseAllocation($allocationId: ID!) {
    deleteSoilInputPurchaseAllocation(allocationId: $allocationId)
  }
`

// ── Finance ────────────────────────────────────────────────────────────────
export const RECORD_OPERATIONAL_COST = gql`
  mutation RecordOperationalCost($input: OperationalCostInput!) {
    recordOperationalCost(input: $input) {
      id
      category
      description
      quantity
      unitCost
      amount
      dateIncurred
      payee
      notes
    }
  }
`

export const UPDATE_OPERATIONAL_COST = gql`
  mutation UpdateOperationalCost($costId: ID!, $input: OperationalCostUpdateInput!) {
    updateOperationalCost(costId: $costId, input: $input) {
      id
      category
      description
      quantity
      unitCost
      amount
      dateIncurred
      payee
      notes
    }
  }
`

export const DELETE_OPERATIONAL_COST = gql`
  mutation DeleteOperationalCost($costId: ID!) {
    deleteOperationalCost(costId: $costId)
  }
`
