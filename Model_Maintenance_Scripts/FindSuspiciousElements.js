
!INC Local Scripts.EAConstants-JScript

/*
 * This code has been included from the default Project Browser template.
 * If you wish to modify this template, it is located in the Config\Script Templates
 * directory of your EA install path.   
 * 
 * Script Name: Find Suspicious Elements
 * Author: Kiran Mukkamala
 * Purpose: To check the diagrams / elements which need to be cleaned up and reviewed
 * Date: 24.07.2023
 */
 
var Finding = 0;


function CheckTaggedValue(Element)
{
	var tag as EA.TaggedValue;
	
	var addtag = true;

	
	//Check if the tagged value(SuspiciousElement) is already set to 'x'
	if (Element.TaggedValues.Count > 0)
	{
		for (var k=0; k < Element.TaggedValues.Count; k ++)
		{
			tag = Element.TaggedValues.GetAt(k);
			if (tag.Name == "Suspicious Element")
			{
				addtag = false;
				if (tag.Value == "x")
				{
					Session.Output("Element already set as suspicious, Further review needed.");
				}
				else
				{
					tag.Value = "x";
					tag.Update();
					Element.TaggedValues.Refresh();
					tag = null;
				}
			}

		}
		
	}

	if (addtag)
	{
		tag = Element.TaggedValues.AddNew("Suspicious Element","x");
		tag.Update();
		Element.TaggedValues.Refresh();
		tag = null;
	}	
}

function CheckName(Name)
{
	const reg1 = new RegExp(/draft/i);
	const reg2 = new RegExp(/tbd/i);
	const reg3 = new RegExp(/placeholder/i);
	return ((Name.search(reg1) != -1) || (Name.search(reg2) != -1) || (Name.search(reg2) != -1));
}
 
 function ExploreElement(Element, spacecount)
 {
	var ele as EA.Element;
	var Diag as EA.Diagram;
	var prp as EA.PropertyType;
	var proplist as EA.Collection;
	var samplelist as EA.Collection; 
	var sample as EA.Element;
	var FormatString = "-->";
	var myconnector as EA.Connector;
	var reg1 = new RegExp(/draft/i);
	var reg2 = new RegExp(/tbd/i);
	 
	//For Pretty print
	for (var j=1; j<spacecount; j++)
		FormatString = "--" + FormatString;
	
	if (CheckName(Element.Name) | CheckName(Element.Notes))
	{
		Finding++;
		Session.Output(FormatString + Finding + ". " + " Element :: " + Element.Name + " with GUID: " + Element.ElementGUID + " is a suspicious. Author name :: " + Element.Author);
		CheckTaggedValue(Element);
	}
	
	//Check for Sub Elements
	for (var i=0; i< Element.Elements.Count;i++)
	{
		ele = Element.Elements.GetAt(i);	
		
		if (ele.Elements.Count > 0)
		{
			var prefindings = Finding;
			ExploreElement(ele, spacecount+1);
			if (Finding > prefindings)
			{
				Session.Output(FormatString + Finding + ". " + " Element :: " + Element.Name + " Sub Element :: " + ele.Name + " with GUID: " + ele.ElementGUID + ", issues found :: " + (Finding-prefindings));
			}
		}
		else
		{
			if (CheckName(ele.Name) | CheckName(ele.Notes))
			{
				Finding++;
				Session.Output(FormatString + Finding + ". " + " Element :: " + Element.Name + " Sub Element :: " + ele.Name + " with GUID: " + ele.ElementGUID + " is a suspicious. Author name :: " + ele.Author);
				CheckTaggedValue(ele);
			}
		}
	}
	var DiagObj as EA.DiagramObject;
	var DiagElement as EA.Element;
	for (var j=0; j< Element.Diagrams.Count;j++)
	{
		Diag = Element.Diagrams.GetAt(j);
		
		for (var y=0; y < Diag.DiagramObjects.Count; y++)
		{
			DiagObj = Diag.DiagramObjects.GetAt(y);
			DiagElement = Repository.GetElementByID(DiagObj.ElementID);
			Session.Output(FormatString + Finding + ". " + " Element :: " + DiagElement.Name + " Type : " + DiagElement.Type);
		}
		if (CheckName(Diag.Name) | CheckName(Diag.Notes))
		{
			Finding++;
			Session.Output(FormatString + Finding + ". " + " Element :: " + Element.Name + " Diagram:: " + Diag.Name + " with GUID: " + Diag.DiagramGUID + " is a suspicious. Author name :: " + Diag.Author);
		}
	}
 }

 function Process_Package(parentPackage, level)
 {
	var PkgList as EA.Collection;
	PkgList = parentPackage.Packages;
	var pkg as EA.Package;
	var subpkg as EA.Package;
		
	if (parentPackage.Elements.Count > 0)
	{
		for (var j=0; j< parentPackage.Elements.Count;j++)
		{
			ExploreElement(parentPackage.Elements.GetAt(j), level+1);
		}
	}
	
	if (PkgList.Count > 0)
	{
//		Session.Output("No.of Sub Packages in Package selected is  :: " + PkgList.Count);
		
		for (var i=0; i< PkgList.Count;i++)
		{
			pkg = PkgList.GetAt(i);
			var SubElementList as EA.Collection;
			
			if (pkg.Element.Type == "Package")
			{
				Process_Package(pkg, level+1);
			}
		}
	}
 }
 
/*
 * Project Browser Script main function
 */
function OnProjectBrowserScript()
{
	// Get the type of element selected in the Project Browser
	var treeSelectedType = Repository.GetTreeSelectedItemType();

	Session.Output("<============ Script Find Suspicious Elements Started ============>");
	
	// Handling Code: Uncomment any types you wish this script to support
	// NOTE: You can toggle comments on multiple lines that are currently
	// selected with [CTRL]+[SHIFT]+[C].
	switch ( treeSelectedType )
	{
		case otElement :
		{
			// Code for when an element is selected
			var theElement as EA.Element;
			theElement = Repository.GetTreeSelectedObject();
			Session.Output("Element :: " + theElement.Name + ", Element Type :: " + theElement.Stereotype + ", Sub Element Count :: " + theElement.Elements.Count);
			if (theElement.Elements.Count > 0)
				{
					ExploreElement(theElement, 1);
				}
			break;
		}
		case otPackage :
		{
			// Code for when a package is selected
			var thePackage as EA.Package;
			thePackage = Repository.GetTreeSelectedObject();
			var ElementList as EA.Collection;
			ElementList = thePackage.Elements;
			Session.Output("Package selected is:: " + thePackage.Name + " No.of SubPackages in Package selected is :: " + thePackage.Packages.Count + " No.of Elements in Package selected is :: " + ElementList.Count);
			var ele as EA.Element;
			for (var i=0; i< ElementList.Count;i++)
			{
				ele = ElementList.GetAt(i);
				ExploreElement(ele, ele.Stereotype, ele.Elements, 1);
			}
			
			// For All Packages
			var PkgList as EA.Collection;
			PkgList = thePackage.Packages;
			var pkg as EA.Package;
			var subpkg as EA.Package;
			
			for (var i=0; i< PkgList.Count;i++)
			{
				pkg = PkgList.GetAt(i);
				var previousfinding = Finding;
				var SubElementList as EA.Collection;
				
				Process_Package(pkg, 1);
			
			}
			
			break;
		}
		case otDiagram :
		{
			// Code for when a diagram is selected
			var theDiagram as EA.Diagram;
			theDiagram = Repository.GetTreeSelectedObject();
			Session.Output("Diagram selected is  :: " + theDiagram.Name);
			break;
		}
		case otAttribute :
		{
			// Code for when an attribute is selected
			var theAttribute as EA.Attribute;
			theAttribute = Repository.GetTreeSelectedObject();
			Session.Output("Attribute selected is  :: " + theAttribute.Name);	
			break;
		}
		case otMethod :
		{
			// Code for when a method is selected
			var theMethod as EA.Method;
			theMethod = Repository.GetTreeSelectedObject();
			
			break;
		}
		default:
		{
			// Error message
			Session.Prompt( "This script does not support items of this type.", promptOK );
		}
	}
	
	if (Finding > 0)
	{
		Session.Output("Total No.of Suspicious Elements identitifed :: " + Finding);
	}
	else
		Session.Output("Good Job!!! No Suspicious Elements identitifed");
	
	Session.Output("<============ Script Find Suspicious Elements Ended ============>");
}

OnProjectBrowserScript();
