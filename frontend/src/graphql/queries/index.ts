import { gql } from '@apollo/client'

// Shared by MY_FARMS and the create/update farm mutations so a manual cache
// write (see FarmFormModal) can never drift out of sync with what this query
// selects — a mismatch there makes Apollo reject the cache write outright.
export const FARM_FIELDS = gql`
  fragment FarmFields on FarmType {
    id
    name
    location
    sizeAcres
    description
    isActive
    isDefault
    createdAt
    members {
      id
      role
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

export const MY_FARMS = gql`
  query MyFarms {
    myFarms {
      ...FarmFields
    }
  }
  ${FARM_FIELDS}
`

// ── Admin: cross-farm user/role management ──────────────────────────────────
export const ALL_FARMS = gql`
  query AllFarms {
    allFarms {
      ...FarmFields
    }
  }
  ${FARM_FIELDS}
`

export const ALL_USERS = gql`
  query AllUsers {
    allUsers {
      id
      username
      email
      firstName
      lastName
      isStaff
      isSuperuser
    }
  }
`

export const FARM = gql`
  query Farm($farmId: ID!) {
    farm(farmId: $farmId) {
      id
      name
      location
      sizeAcres
      description
      members {
        id
        role
        user {
          id
          username
          email
        }
      }
    }
  }
`

export const SUPPLIERS = gql`
  query Suppliers {
    suppliers {
      id
      name
      phone
      location
      notes
      productUrl
    }
  }
`

export const PLANTINGS = gql`
  query Plantings($farmId: ID!, $status: String) {
    plantings(farmId: $farmId, status: $status) {
      id
      acreage
      plantingDate
      expectedHarvestDate
      season
      status
      notes
      seedlingQuantityKg
      createdAt
      totalCost
      totalRevenue
      profit
      crop {
        id
        name
        category
      }
      seedling {
        id
        name
      }
      yields {
        id
        harvestDate
        quantity
        unit
        qualityGrade
        unitPrice
        totalRevenue
        notes
      }
      damages {
        id
        damageType
        severity
        dateReported
        areaAffectedAcres
        estimatedLossValue
        description
        imageUrl
      }
      pestIncidents {
        id
        pestName
        dateObserved
        severity
        areaAffectedAcres
        actionTaken
        notes
        imageUrl
      }
      pesticideApplications {
        id
        quantity
        totalCost
        planting {
          id
        }
        purchase {
          id
          dateApplied
          unit
          unitCost
          contentAmount
          contentUnit
          notes
          supplier {
            id
            name
          }
          pesticide {
            id
            name
            pesticideType
          }
          allocations {
            id
            quantity
            farm {
              id
              name
            }
            planting {
              id
            }
          }
        }
      }
    }
  }
`

export const CROPS = gql`
  query Crops {
    crops {
      id
      name
      category
      notes
    }
  }
`

export const PESTICIDE_APPLICATIONS = gql`
  query PesticideApplications($farmId: ID!) {
    pesticideApplications(farmId: $farmId) {
      id
      quantity
      totalCost
      planting {
        id
        crop {
          id
          name
        }
      }
      purchase {
        id
        dateApplied
        quantity
        unit
        unitCost
        contentAmount
        contentUnit
        notes
        supplier {
          id
          name
        }
        pesticide {
          id
          name
          pesticideType
        }
        allocations {
          id
          quantity
          farm {
            id
            name
          }
          planting {
            id
          }
        }
      }
    }
  }
`

export const PESTICIDES = gql`
  query Pesticides {
    pesticides {
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

export const FENCE_DAMAGES = gql`
  query FenceDamages($farmId: ID!, $repairStatus: String) {
    fenceDamages(farmId: $farmId, repairStatus: $repairStatus) {
      id
      locationDescription
      damageType
      dateReported
      severity
      repairStatus
      repairCost
      dateRepaired
      notes
      imageUrl
    }
  }
`

export const LIVESTOCK_CENSUSES = gql`
  query LivestockCensuses($farmId: ID!, $animalType: String) {
    livestockCensuses(farmId: $farmId, animalType: $animalType) {
      id
      animalType
      censusDate
      totalCount
      maleCount
      femaleCount
      juvenileCount
      notes
      imageUrl
    }
  }
`

export const LIVESTOCK_EVENTS = gql`
  query LivestockEvents(
    $farmId: ID!
    $animalType: String
    $eventType: String
    $fromDate: Date
    $toDate: Date
  ) {
    livestockEvents(
      farmId: $farmId
      animalType: $animalType
      eventType: $eventType
      fromDate: $fromDate
      toDate: $toDate
    ) {
      id
      animalType
      eventType
      eventDate
      count
      unitValue
      totalValue
      causeOfDeath
      notes
      imageUrl
    }
  }
`

export const EGG_PRODUCTIONS = gql`
  query EggProductions($farmId: ID!, $birdType: String, $fromDate: Date, $toDate: Date) {
    eggProductions(farmId: $farmId, birdType: $birdType, fromDate: $fromDate, toDate: $toDate) {
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
      imageUrl
    }
  }
`

export const LIVESTOCK_SUMMARY = gql`
  query LivestockSummary($farmId: ID!) {
    livestockSummary(farmId: $farmId) {
      animalType
      latestCount
      birthsThisMonth
      deathsThisMonth
      purchasesThisMonth
      salesThisMonth
    }
  }
`

export const VET_DRUGS = gql`
  query VetDrugs {
    vetDrugs {
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

export const TREATMENTS = gql`
  query Treatments($farmId: ID!, $animalType: String, $fromDate: Date, $toDate: Date) {
    treatments(farmId: $farmId, animalType: $animalType, fromDate: $fromDate, toDate: $toDate) {
      id
      quantity
      totalCost
      purchase {
        id
        animalType
        animalCountTreated
        treatmentDate
        dosagePerAnimal
        quantityUsed
        unit
        unitCost
        contentAmount
        contentUnit
        supplier {
          id
          name
        }
        conditionTreated
        outcome
        notes
        drug {
          id
          name
          drugType
        }
        allocations {
          id
          quantity
          farm {
            id
            name
          }
        }
      }
    }
  }
`

export const ANIMAL_FEEDS = gql`
  query AnimalFeeds {
    animalFeeds {
      id
      name
      feedType
      targetSpecies
      notes
      productUrl
      imageUrl
    }
  }
`

export const FEED_RECORDS = gql`
  query FeedRecords($farmId: ID!, $animalType: String, $fromDate: Date, $toDate: Date) {
    feedRecords(farmId: $farmId, animalType: $animalType, fromDate: $fromDate, toDate: $toDate) {
      id
      quantity
      totalCost
      purchase {
        id
        animalType
        feedDate
        quantity
        unit
        unitCost
        contentAmount
        contentUnit
        supplier {
          id
          name
        }
        animalCountFed
        notes
        feed {
          id
          name
          feedType
        }
        allocations {
          id
          quantity
          farm {
            id
            name
          }
        }
      }
    }
  }
`

export const SEEDLINGS = gql`
  query Seedlings {
    seedlings {
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

export const SEEDLING_PURCHASES = gql`
  query SeedlingPurchases($farmId: ID!) {
    seedlingPurchases(farmId: $farmId) {
      id
      quantity
      totalCost
      planting {
        id
      }
      purchase {
        id
        purchaseDate
        quantity
        unit
        unitCost
        contentAmount
        contentUnit
        supplier {
          id
          name
        }
        notes
        seedling {
          id
          name
          crop {
            id
            name
          }
        }
        allocations {
          id
          quantity
          farm {
            id
            name
          }
          planting {
            id
          }
        }
      }
    }
  }
`

export const SOIL_INPUTS = gql`
  query SoilInputs {
    soilInputs {
      id
      name
      inputType
      notes
      productUrl
      imageUrl
    }
  }
`

export const SOIL_TREATMENTS = gql`
  query SoilTreatments($farmId: ID!) {
    soilTreatments(farmId: $farmId) {
      id
      quantity
      totalCost
      planting {
        id
      }
      purchase {
        id
        dateApplied
        quantity
        unit
        areaCoveredAcres
        unitCost
        contentAmount
        contentUnit
        supplier {
          id
          name
        }
        notes
        soilInput {
          id
          name
          inputType
        }
        allocations {
          id
          quantity
          farm {
            id
            name
          }
          planting {
            id
          }
        }
      }
    }
  }
`

export const SOIL_INPUT_PURCHASES = gql`
  query SoilInputPurchases($farmId: ID!) {
    soilInputPurchases(farmId: $farmId) {
      id
      quantity
      totalCost
      planting {
        id
      }
      purchase {
        id
        purchaseDate
        quantity
        unit
        unitCost
        contentAmount
        contentUnit
        supplier {
          id
          name
        }
        notes
        soilInput {
          id
          name
          inputType
        }
        allocations {
          id
          quantity
          farm {
            id
            name
          }
          planting {
            id
          }
        }
      }
    }
  }
`

export const OPERATIONAL_COSTS = gql`
  query OperationalCosts($farmId: ID!, $category: String, $fromDate: Date, $toDate: Date) {
    operationalCosts(farmId: $farmId, category: $category, fromDate: $fromDate, toDate: $toDate) {
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
