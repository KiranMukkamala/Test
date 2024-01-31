
!INC Local Scripts.EAConstants-JScript

/*
 * This code has been included from the default Project Browser template.
 * If you wish to modify this template, it is located in the Config\Script Templates
 * directory of your EA install path.   
 * 
 * Script Name: Extended_Checks_For_Logical_Interfaces
 * Author: Kiran Mukkamala
 * Purpose: To check the L3 logical interface issues thoroughly
 * Date: 21.07.2023
 */
 
var Finding = 0;
 
 function ExploreElement(Packagename = " ", ElementType, SubElementList, spacecount)
 
 {
	var ele as EA.Element;
	var prp as EA.PropertyType;
	var proplist as EA.Collection;
	var samplelist as EA.Collection; 
	var sample as EA.Element;
	var FormatString = "-->";
	var myconnector as EA.Connector;
	
	//For Pretty print
	for (var j=1; j<spacecount; j++)
		FormatString = "--" + FormatString 
	
	for (var i=0; i< SubElementList.Count;i++)
	{
		ele = SubElementList.GetAt(i);
		        
		samplelist = ele.Connectors;		
		
		if (ele.Elements.Count > 0)
		{			
			if (ElementType == "InterfaceBlock" && ele.Stereotype != "FlowProperty")
			{
				Finding++;
				Session.Output(FormatString + Finding + ". " + " Package :: " + Packagename + " Sub Element :: " + ele.Name + " is not a Flow Property, Type :: " + ele.Stereotype + "." + ele.Type + " is not allowed here. Author name :: " + ele.Author);
			}
			
			var prefindings = Finding;
			ExploreElement(Packagename, ele.Stereotype, ele.Elements, spacecount+1);
			if (Finding > prefindings)
			{
				Session.Output(FormatString + " Package :: " + Packagename + " Sub Element :: " + ele.Name + ", issues found :: " + (Finding-prefindings));
			}
		}
		else
		{
			if (ElementType == "InterfaceBlock" && ele.Stereotype != "FlowProperty")
			{
				Finding++;
				Session.Output(FormatString + Finding + ". " + " Package :: " + Packagename + " Sub Element :: " + ele.Name + " is not a Flow Property, Type :: " + ele.Stereotype + "." + ele.Type + " is not allowed here. Author name :: " + ele.Author);
			}
			else
			{
				proplist = ele.TaggedValuesEx;
		
				for (var k=0; k< proplist.Count;k++)
				{
					prp = ele.TaggedValuesEx.GetAt(k);
					
					if (prp.Name == "direction" && prp.Value != "out")
					{
						Finding++;
						Session.Output(FormatString + Finding + ". "  + " Package :: " + Packagename + " Sub Element :: " + ele.Name + " direction should be out " + ", actual direction :: " + prp.Value + " Author name :: " + ele.Author);
					}
					
				}
				
				if (ele.ClassfierID == "")
				{
					Finding++;
					Session.Output(FormatString + Finding + ". "  + " Package :: " + Packagename + " Sub Element :: " + ele.Name + " is missing classifier, " + " Author name :: " + ele.Author);

				}
				
			}
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
		var previousfinding = Finding;
		ExploreElement(parentPackage.Name, parentPackage.Type, parentPackage.Elements, level);
		if( Finding > previousfinding)
		{
			Session.Output("Package :: " + parentPackage.Name + ", Issues found :: " + (Finding - previousfinding));
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

	Session.Output("<============ Script Extended_Checks_For_Logical_Interfaces Started ============>");
	
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
					ExploreElement(theElement.Stereotype, theElement.Elements, 2);
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
			Session.Output("Package selected is  :: " + thePackage.Name + " No.of SubPackages in Package selected is  :: " + thePackage.Packages.Count + " No.of Elements in Package selected is  :: " + ElementList.Count);
			var ele as EA.Element;
			for (var i=0; i< ElementList.Count;i++)
			{
				ele = ElementList.GetAt(i);
				if (ele.Elements.Count > 0)
				{
					var previousfinding = Finding;
					ExploreElement(ele.Name, ele.Stereotype, ele.Elements, 1);
					if( Finding > previousfinding)
					{
						Session.Output("Package :: " + ele.Name + ", Issues found :: " + (Finding - previousfinding) );
					}
				}	
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
		Session.Output("Total No.of Problems identitifed :: " + Finding);
	}
	else
		Session.Output("Good Job!!! No Problems identitifed");
	
	Session.Output("<============ Script Extended_Checks_For_Logical_Interfaces Ended ============>");
}

OnProjectBrowserScript();
