# variant-facet

In a scenario were all the information is not stored into a single object inside the index, you might want to show facets depending on child objects.

For example:
* Product (Main object) with Size, Color and Width object (Child object).
* Resume (Main object) with Year, Degree and School object (Child object).

The requirement could be to have a search interface to quickly find:
* Products, with a specific Size & Color combination
* Resume's, with a specific Degree & School combination

If we would simply index Size, Color, Width as multi value fields then you would be able to filter on them, but not the combination.

The variant facet will create a nested query to retrieve only the values requested.

A complete example:

Person object: Type=Person, Name=Wim, Country=NL, ID=12
Person object: Type=Person, Name=Peter, Country=USA, ID=13
Person object: Type=Person, Name=Annie, Country=NL, ID=14
Education object: Type=Education, ID=12, School=Alabama University, Year=1969, Degree=MBA
Education object: Type=Education, ID=12, School=NY University, Year=1989, Degree=Doctor
Education object: Type=Education, ID=13, School=NY University, Year=1979, Degree=Bachelor
Education object: Type=Education, ID=13, School=NY University, Year=1989, Degree=MBA
Education object: Type=Education, ID=13, School=NY University, Year=1999, Degree=Doctor
Education object: Type=Education, ID=14, School=SF University, Year=1989, Degree=MBA

1. No Query, Variant facet will use:
  * queryOverride: [[idField] childQuery]
  * advancedQueryOverride: advancedExpression ("")
  * constantQueryOverride: constantExpression ("")
2. Query
  * queryOverride: QUERY [[idField] childQuery]
  * advancedQueryOverride: advancedExpression ("")
  * constantQueryOverride: constantExpression ("")
3. Query, Normal facet selected
  * advancedQuery: @country==NL (this is on the parent object)
  * queryOverride: QUERY [[idField] childQuery]
  * advancedQueryOverride: advancedQuery (@country==NL)
  * constantQueryOverride: constantExpression ("")
4. Query, Normal Facets selected.
  * advancedQuery: @country==NL @region==FL (this is on the parent object)
  * queryOverride: QUERY [[idField] childQuery]
  * advancedQueryOverride: advancedQuery (@country==NL @region==FL)
  * constantQueryOverride: constantExpression ("")
5. Query, Normal Facets selected and Variant selected.
  * by default advancedQuery ==> @country==NL @region==FL @school=="NY University"
  * if Variant facet in advancedQuery then rewrite advancedQuery to:
  * advancedQuery: @country==NL @region==FL (this is on the parent object) [[idField] @school=="NY University" childQuery] (this is on the child)
  * queryOverride: QUERY [[idField] childQuery advancedQuery(nested part only)]
  * advancedQueryOverride: advancedQuery (@country==NL @region==FL), only from parent
  * constantQueryOverride: constantExpression ("")
6. Query, Normal Facets selected and Variants selected.
  * by default advancedQuery ==> @country==NL @region==FL @school=="NY University" @degree=="MBA" 
  * if Variant facet in advancedQuery then rewrite advancedQuery to:
  * advancedQuery: @country==NL @region==FL (this is on the parent object) [[idField] @school=="NY University" @degree=="MBA" childQuery] (this is on the child)
  * queryOverride: QUERY [[idField] childQuery advancedQuery(nested part only)]
  * advancedQueryOverride: advancedQuery (@country==NL @region==FL), only from parent
  * constantQueryOverride: constantExpression ("")

We only need a VariantFacetManager
  * In steps:
    * School variant
    * @country==NL @region==FL @school=="NY University" @degree=="MBA" 
    * rewrite to: @country==NL @region==FL @degree=="MBA" [[idField] @school=="NY University" childQuery] 
    * Degree variant
    * @country==NL @region==FL @degree=="MBA" [[idField] @school=="NY University" childQuery]  
    * rewrite to: @country==NL @region==FL  [[idField] @school=="NY University" @degree=="MBA" childQuery] 
    * Now we have a proper AdvancedQuery for the SEARCH
    * Now we need to change the advancedQuery for the Facets
    * For each facet:
    *    Add the new advancedQuery
    *    FIX THE FACET INSTANCE
    *  If Variant facet:
    *    advancedQuery: is empty
    *    variantQuery: selectedValues of current facet
    *    queryOverride: childQuery variantQuery [[idField] new advancedQuery]
    *    FIX THE FACET INSTANCE



VariantFacet should:
* DoneBuildingQuery (access to basic expression, change the groupbyrequest)
  * Change the advancedExpression 
  * Change GroupbyRequest queryOverride

|------|------------------------|-----------------------|------------------------|
|Facet | No Query               | Normal Facet Selected | Variant Facet Selected |
|------|------------------------|-----------------------|------------------------|
|Country| -                     | @country==NL          | @country==NL           |
|AQ     |                       |                       | @country==NL [[idField] @school=="NY University" @degree=="MBA" childQuery] |
|       |                       |                       | @country==NL [[idField] ALL_VARIANT_FACET_SELECTIONS childQuery] |
|       |                       |                       | This will be automatically added to the normal facets |
|School | cq = @type==Education | cq = @type==Education | cq = @type==Education |
|       | aq = [[idField]]      | aq = @country==NL [[idField]] | aq = @country==NL [[idField] ADVANCEDEXPRESSION] |
|       | q = ""                | q =  QUERY     | q = QUERY |

I somehow need to hold the Variant Facets ... Like Francois is doing. 



*** Important: Use the same fieldname for the Parent & Child ID's ***

Using the variant facet we are now able to search for people who went to NY University and got a Doctor degree.
It will create a (nested) query like:
@type=person [[@id] @type==education @school=="NY University" @degree=="Doctor"]

Test:
@school includeInFreeText=true parentQuery="@type==person" childQuery="@type==education" idField="@id"
@Year includeInFreeText=false  parentQuery="@type==person" childQuery="@type==education" idField="@id"
@degree includeInFreeText=true  parentQuery="@type==person" childQuery="@type==education" idField="@id"
as facets defined

When i search for NY: 
add dq: parentQuery [[idField] childQuery @school="QUERY"] OR @type=person [[idField] childQuery @degree="QUERY"]


Disclaimer: This component was built by the community at large and is not an official Coveo JSUI Component. Use this component at your own risk.

## Getting Started

1. Install the component into your project.

```
npm i @coveops/variant-facet
```

2. Use the Component or extend it

Typescript:

```javascript
import { variant-facet, Ivariant-facetOptions } from '@coveops/variant-facet';
```

Javascript

```javascript
const variant-facet = require('@coveops/variant-facet').variant-facet;
```

3. You can also expose the component alongside other components being built in your project.

```javascript
export * from '@coveops/variant-facet'
```

4. Include the component in your template as follows:

Place the component in your markup:

```html
<div class="Coveovariant-facet"></div>
```

## Extending

Extending the component can be done as follows:

```javascript
import { variant-facet, Ivariant-facetOptions } from "@coveops/variant-facet";

export interface IExtendedvariant-facetOptions extends Ivariant-facetOptions {}

export class Extendedvariant-facet extends variant-facet {}
```

## Contribute

1. Clone the project
2. Copy `.env.dist` to `.env` and update the COVEO_ORG_ID and COVEO_TOKEN fields in the `.env` file to use your Coveo credentials and SERVER_PORT to configure the port of the sandbox - it will use 8080 by default.
3. Build the code base: `npm run build`
4. Serve the sandbox for live development `npm run serve`